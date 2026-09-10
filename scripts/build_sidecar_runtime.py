r"""Assemble a self-contained Python runtime for the desktop sidecar.

`src-tauri/src/main.rs` spawns `python -m desktop.bootstrap`. On a developer's
machine "python" is on PATH; on Emilia's laptop there is no Python at all
(TICKETS T-20). This script builds the runtime the packaged app carries with
it, so the sidecar has an interpreter of its own.

The python.org **embeddable** distribution rather than a PyInstaller freeze,
which is what the desktop plan originally named. It is 12 MB, it is real
CPython — so nothing about imports, `__file__` or subprocesses behaves oddly —
and assembling it is this one script instead of a spec file whose failures
appear only in the packaged build. Freeze later if something forces it.

    python scripts/build_sidecar_runtime.py

Output, gitignored:

    src-tauri/runtime/
      python/                 the interpreter, with site-packages beside it
      app/                    core, db, api, desktop, alembic.ini
      MANIFEST.json           what went in, so the installer's size is explainable

**Playwright is deliberately absent.** Its Python package is 110 MB — nearly
all of it a bundled Node driver — which would triple the installer for a
feature that returns a clean 503 without it. How the desktop renders a PDF is
T-21's decision, and the answer is probably not this library: Edge prints a
page to PDF from its own command line with no Python dependency at all.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from zipfile import ZipFile

REPO = Path(__file__).resolve().parent.parent
RUNTIME = REPO / "frontend-electron" / "src-tauri" / "runtime"
CACHE = REPO / "var" / "cache"

#  Pinned to the version the tests run on: the compiled wheels below are
#  cp314-specific, and an embeddable runtime of another minor version rejects
#  them at import with an error that names neither cause.
PYTHON_VERSION = "3.14.4"
PYTHON_TAG = "314"

#  What ships is **the lockfile minus these**, rather than a hand-written list.
#  A hand-written list re-resolves against PyPI and drifts: the first version of
#  this script installed FastAPI 0.141 and Starlette 1.6 where `uv.lock` pins
#  0.139 and 1.0 — and 0.139 is the release that changed `app.routes` and
#  silently broke a guard test (SOLO_RUN § What changed underneath us). The
#  runtime a customer gets must be the versions the suite ran against.
#
#    playwright, pyee  — 110 MB, nearly all a bundled Node driver. See the
#                        module docstring; PDF rendering is T-21's decision.
#    psycopg*          — the desktop is SQLite-only and never imports it.
EXCLUDED = {"playwright", "pyee", "psycopg", "psycopg-binary", "psycopg-pool"}

#  What the sidecar needs from the repo. `desktop.bootstrap` runs with `app/`
#  as its working directory, exactly as it runs from the repo root in dev.
APP_SOURCES = ["core", "db", "api", "desktop", "alembic.ini"]

#  Nothing here is imported at runtime, and all of it is measurable weight.
PRUNE_DIRS = {"__pycache__", "tests", "test"}
PRUNE_SUFFIXES = {".pyc", ".pyo", ".pdb", ".exp", ".lib"}


def log(message: str) -> None:
    print(f"  {message}", flush=True)


def directory_size(path: Path) -> int:
    return sum(
        os.path.getsize(os.path.join(root, name))
        for root, _dirs, files in os.walk(path)
        for name in files
    )


def download_embeddable() -> Path:
    name = f"python-{PYTHON_VERSION}-embed-amd64.zip"
    target = CACHE / name
    if target.exists():
        log(f"cached {name} ({target.stat().st_size / 1e6:.1f} MB)")
        return target

    CACHE.mkdir(parents=True, exist_ok=True)
    url = f"https://www.python.org/ftp/python/{PYTHON_VERSION}/{name}"
    log(f"downloading {url}")
    #  A partial name first: a half-written zip left at the cache path would be
    #  treated as cached on the next run and fail somewhere less obvious.
    partial = target.with_suffix(".part")
    urllib.request.urlretrieve(url, partial)  # noqa: S310 - pinned python.org URL
    partial.replace(target)
    log(f"got {target.stat().st_size / 1e6:.1f} MB")
    return target


def unpack_interpreter(archive: Path, into: Path) -> None:
    """Extract the embeddable distribution and let it see site-packages.

    The embeddable build ships `python314._pth`, which pins `sys.path` and
    leaves `import site` commented out — that is what makes it embeddable, and
    it is also why a plain `pip install --target` into it imports nothing. The
    file is rewritten to add site-packages and the app directory.

    **`import site` stays commented out**, and that is the point of this
    function. Uncommenting it — the obvious move, and what the first version of
    this script did — re-enables the *user* site directory, so the runtime
    silently picks up the roaming profile of whatever machine it runs on. Here
    that meant the sidecar imported the developer's FastAPI and rendered a PDF
    through the developer's Playwright: a build that passes on this laptop and
    fails on Emilia's with an ImportError. Nothing installed below ships a
    `.pth` file, so site processing buys nothing and costs that.
    """
    into.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as zf:
        zf.extractall(into)
    log(f"interpreter unpacked ({directory_size(into) / 1e6:.1f} MB)")

    pth = into / f"python{PYTHON_TAG}._pth"
    pth.write_text(
        "\n".join(
            [
                f"python{PYTHON_TAG}.zip",
                ".",
                "Lib\\site-packages",
                #  The application tree, resolved relative to this file, so the
                #  sidecar imports `core`/`api`/`db`/`desktop` without anyone
                #  setting PYTHONPATH.
                "..\\app",
                "",
                #  Deliberately NOT "import site" — see the docstring above.
                #  Guarded by scripts/check_sidecar_runtime.py, which asserts
                #  the host's site-packages is absent from the runtime's path.
                "# import site",
                "",
            ]
        ),
        encoding="utf-8",
    )


def resolve_requirements() -> list[str]:
    """The locked dependency set, minus what must not ship.

    `uv export --frozen` is the same command CI audits from, so the runtime and
    the test suite cannot disagree about a version. Markers are kept verbatim —
    `uvloop` carries `sys_platform != 'win32'` and pip is left to skip it.
    """
    exported = subprocess.run(
        [
            sys.executable,
            "-m",
            "uv",
            "export",
            "--frozen",
            "--no-dev",
            "--all-packages",
            "--no-emit-workspace",
            "--no-hashes",
        ],
        check=True,
        capture_output=True,
        text=True,
        cwd=REPO,
    ).stdout

    requirements = []
    for line in exported.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        name = stripped.split("==")[0].split(";")[0].strip().lower()
        if name in EXCLUDED:
            continue
        requirements.append(stripped)

    if not requirements:
        raise SystemExit("uv export produced nothing — refusing to ship an empty runtime")
    return requirements


def install_dependencies(runtime_python: Path) -> list[str]:
    """Install the locked wheels into the embeddable runtime's site-packages.

    Driven by the *host* pip with `--target`, not by bootstrapping pip inside
    the embeddable build: the host is the same CPython version and platform, so
    the wheels are the same wheels, and the runtime stays free of pip itself.

    `--no-deps` because the export above is already the complete closure. It is
    also the guard: without it pip would happily re-add `playwright` as
    `billgen-core`'s dependency, which is the one thing this excludes.
    """
    requirements = resolve_requirements()
    target = runtime_python / "Lib" / "site-packages"
    target.mkdir(parents=True, exist_ok=True)

    requirements_file = RUNTIME / "requirements.lock.txt"
    requirements_file.write_text("\n".join(requirements) + "\n", encoding="utf-8")

    log(f"installing {len(requirements)} locked packages into {target.name}")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--quiet",
            "--target",
            str(target),
            "--no-deps",
            #  Wheels only: a source distribution would build against the host,
            #  and there is no compiler on Emilia's laptop either way.
            "--only-binary",
            ":all:",
            "--requirement",
            str(requirements_file),
        ],
        check=True,
        cwd=REPO,
    )
    log(f"site-packages {directory_size(target) / 1e6:.1f} MB")
    return requirements


def copy_application(app_dir: Path) -> None:
    app_dir.mkdir(parents=True, exist_ok=True)
    for name in APP_SOURCES:
        source = REPO / name
        destination = app_dir / name
        if source.is_dir():
            shutil.copytree(
                source,
                destination,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(*PRUNE_DIRS, "*.pyc"),
            )
        else:
            shutil.copy2(source, destination)
    log(f"application {directory_size(app_dir) / 1e6:.1f} MB")


def prune(root: Path) -> int:
    """Remove what is never imported. Returns the bytes reclaimed."""
    before = directory_size(root)
    for path, dirs, files in os.walk(root, topdown=True):
        for name in list(dirs):
            if name in PRUNE_DIRS:
                shutil.rmtree(Path(path) / name, ignore_errors=True)
                dirs.remove(name)
        for name in files:
            if Path(name).suffix in PRUNE_SUFFIXES:
                (Path(path) / name).unlink(missing_ok=True)
    reclaimed = before - directory_size(root)
    log(f"pruned {reclaimed / 1e6:.1f} MB")
    return reclaimed


def write_manifest(runtime: Path) -> dict:
    """Record what shipped, so an installer's size is explainable later."""
    python_dir = runtime / "python"
    app_dir = runtime / "app"
    site_packages = python_dir / "Lib" / "site-packages"
    packages = sorted(
        entry.name.removesuffix(".dist-info").replace("-", " ", 1)
        for entry in site_packages.iterdir()
        if entry.name.endswith(".dist-info")
    )
    manifest = {
        "python_version": PYTHON_VERSION,
        "packages": packages,
        "excluded": {
            "playwright, pyee": "110 MB, mostly a bundled Node driver — see T-21",
            "psycopg*": "the desktop is SQLite-only and never imports it",
        },
        "bytes": {
            "interpreter": directory_size(python_dir) - directory_size(site_packages),
            "site_packages": directory_size(site_packages),
            "application": directory_size(app_dir),
            "total": directory_size(runtime),
        },
    }
    (runtime / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--clean",
        action="store_true",
        help="rebuild from scratch rather than updating in place",
    )
    args = parser.parse_args()

    if args.clean and RUNTIME.exists():
        log("removing the previous runtime")
        shutil.rmtree(RUNTIME)

    print(f"building the sidecar runtime in {RUNTIME.relative_to(REPO)}")
    archive = download_embeddable()
    unpack_interpreter(archive, RUNTIME / "python")
    install_dependencies(RUNTIME / "python")
    copy_application(RUNTIME / "app")
    prune(RUNTIME)
    manifest = write_manifest(RUNTIME)

    total = manifest["bytes"]["total"] / 1e6
    print(f"\nruntime ready: {total:.1f} MB")
    for part, size in manifest["bytes"].items():
        if part != "total":
            print(f"  {part:14} {size / 1e6:7.1f} MB")
    print(f"\n  {RUNTIME / 'python' / 'python.exe'}")
    print("  smoke test it with:")
    print(
        '    BILLGEN_PYTHON="<runtime>/python/python.exe" '
        "python -m desktop.bootstrap   # from <runtime>/app"
    )


if __name__ == "__main__":
    main()
