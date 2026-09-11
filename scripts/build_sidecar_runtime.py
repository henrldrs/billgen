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
      THIRD-PARTY-NOTICES.txt every package in uv.lock, and its licence

**What ships is bytecode, not source** (T-30). Everything under `python/` and
`app/` is compiled with `-OO` to a `.pyc` beside where the `.py` was, and the
`.py` is then deleted — the classic sourceless layout, which CPython imports
natively. A `.py` whose compile failed keeps its source rather than becoming an
unimportable hole, and the count of those is in the manifest.

That also answers §11c the short way. The rule is that comments must not ship
*and* must not be deleted from the tree; a build that ships no source ships no
comments, and this script only ever writes into `runtime/`, so a checkout keeps
every comment it had. There is nothing to strip.

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

#  Said in THIRD-PARTY-NOTICES.txt too, because "why is Playwright in the
#  dependency graph and not in the installer" is the question that file exists
#  to answer for anyone who did not write this script.
EXCLUDED_REASONS = {
    "playwright": "110 MB, nearly all a bundled Node driver; the desktop prints "
    "through the installed Edge instead (T-21)",
    "pyee": "a Playwright dependency, and Playwright is not shipped",
    "psycopg": "the desktop is SQLite-only and never imports it",
    "psycopg-binary": "the desktop is SQLite-only and never imports it",
    "psycopg-pool": "the desktop is SQLite-only and never imports it",
}

#  What the sidecar needs from the repo. `desktop.bootstrap` runs with `app/`
#  as its working directory, exactly as it runs from the repo root in dev.
APP_SOURCES = ["core", "db", "api", "desktop", "alembic.ini"]

#  Nothing here is imported at runtime, and all of it is measurable weight.
PRUNE_DIRS = {"__pycache__", "tests", "test"}
PRUNE_SUFFIXES = {".pyc", ".pyo", ".pdb", ".exp", ".lib"}

#  T-30 named tkinter, test, idlelib, turtle, ensurepip and pydoc_data. Five of
#  the six are **already absent**: the python.org embeddable distribution ships
#  none of them, which is measured rather than assumed — `python314.zip` is 563
#  members and 4.1 MB, and the only one of the six inside it is `pydoc_data`.
#  Rewriting a 4 MB stdlib zip to save a few kilobytes of it would trade a real
#  risk (a stdlib that no longer matches any released CPython) for nothing, so
#  the trimming this script does is the part that pays: the source.
STDLIB_ALREADY_TRIMMED = ("tkinter", "test", "idlelib", "turtle", "ensurepip")


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


def compile_to_bytecode(runtime: Path) -> dict[str, int]:
    """Compile everything to `.pyc` beside the source, then delete the source.

    `-OO` (no docstrings, no asserts) and `-b` (legacy location: `foo.pyc`,
    not `__pycache__/foo.cpython-314.pyc`), because a sourceless import and
    Alembic's sourceless mode both look beside the file.

    Run with the **runtime's own interpreter**, not this one. They are the same
    version today; a build whose bytecode magic silently did not match the
    interpreter that has to load it is a failure that appears only on the
    customer's machine.

    A file that fails to compile keeps its `.py`. Deleting source whose
    bytecode was never written would turn a package that works into one that
    cannot be imported at all, which is a much worse trade than a few kilobytes.
    """
    python = runtime / "python" / "python.exe"
    targets = [runtime / "python" / "Lib" / "site-packages", runtime / "app"]
    before = directory_size(runtime)

    subprocess.run(
        [
            str(python),
            "-OO",
            "-m",
            "compileall",
            "-q",
            "-b",
            "--invalidation-mode",
            "unchecked-hash",
            *[str(t) for t in targets],
        ],
        #  compileall exits non-zero when *any* file fails, and a handful in a
        #  dependency's test fixtures always will. The loop below is the real
        #  check: nothing loses its source unless its bytecode exists.
        check=False,
        cwd=REPO,
    )

    compiled = kept = 0
    for target in targets:
        for source in target.rglob("*.py"):
            if source.with_suffix(".pyc").exists():
                source.unlink()
                compiled += 1
            else:
                kept += 1
    #  compileall -b leaves none, but a package shipping its own __pycache__
    #  would otherwise double the bytecode.
    for cache in list(runtime.rglob("__pycache__")):
        shutil.rmtree(cache, ignore_errors=True)

    delta = directory_size(runtime) - before
    #  Reported as a delta and not as a saving, because it is not one: on this
    #  dependency set the bytecode comes out slightly *larger* than the source
    #  it replaces, even with docstrings stripped. What this step buys is a
    #  build that ships no readable source, and it costs about a megabyte.
    log(f"compiled {compiled} modules, kept {kept} unbuildable, size {delta / 1e6:+.1f} MB")
    return {"compiled": compiled, "kept_as_source": kept, "size_delta": delta}


def enable_sourceless_alembic(app_dir: Path) -> None:
    r"""Tell Alembic the packaged build has bytecode and no source.

    Without this a fresh install finds **zero revisions** and `upgrade head`
    quietly succeeds against an empty database — the worst shape a failure can
    take, because nothing errors until the first query.

    Written into the *copied* `alembic.ini` only, never the repository's. Turned
    on in a checkout, `sourceless = true` makes Alembic read
    `versions/__pycache__` as well, so bytecode left behind by a migration that
    was deleted comes back as a phantom revision. That is not hypothetical: it
    was tried here first, and `a8764bd4120a_drift_check` — gone from the tree
    for who knows how long — returned as a second head and broke
    `tests/db/test_migrations.py` on the spot.
    """
    ini = app_dir / "alembic.ini"
    text = ini.read_text(encoding="utf-8")
    marker = "# sourceless = false"
    if marker not in text:
        raise SystemExit(
            "alembic.ini no longer has the commented-out `sourceless` line the "
            "packaging step rewrites — check what replaced it before shipping."
        )
    ini.write_text(
        text.replace(
            marker,
            "#  Set by scripts/build_sidecar_runtime.py: this copy ships bytecode\n"
            "#  and no source. The repository's alembic.ini leaves it off — see\n"
            "#  that script's enable_sourceless_alembic().\n"
            "sourceless = true",
        ),
        encoding="utf-8",
    )
    log("alembic: sourceless mode on, in the packaged copy only")


def write_third_party_notices(runtime: Path, requirements: list[str]) -> int:
    """Name every package in `uv.lock` and the licence it is redistributed under.

    Driven by the lockfile, not by what happens to be installed: a redistributed
    build carries obligations for everything inside it, and a notice generated
    from the runtime would silently stop naming a package the day it was
    excluded — which is precisely when the question "what did we ship" gets
    asked. Excluded packages are listed too, marked as not shipped, so the file
    answers both halves of that question.

    Three states, and keeping them apart is the point. **Shipped** packages are
    redistributed and carry obligations; the licence comes from the installed
    `.dist-info`, and a package that declares none is named as undeclared
    rather than omitted, because a gap someone can close beats a file that
    looks complete. **Development-only** packages (pytest, mypy, httpx) are in
    the lockfile and not in the build — nothing is redistributed, so nothing is
    claimed about their licences. **Deliberately excluded** packages are the
    ones a reader will ask about by name: Playwright and psycopg are in the
    dependency graph and still not in the installer, and this file is where
    that is written down.
    """
    site_packages = runtime / "python" / "Lib" / "site-packages"
    installed: dict[str, Path] = {}
    for entry in site_packages.glob("*.dist-info"):
        name = entry.name.rsplit("-", 2)[0].lower().replace("_", "-")
        installed[name] = entry

    shipped = {
        line.split("==")[0].split(";")[0].strip().lower().replace("_", "-")
        for line in requirements
    }

    lines = [
        "THIRD-PARTY NOTICES",
        "",
        "BillGen redistributes the packages below. Generated from uv.lock by",
        "scripts/build_sidecar_runtime.py — do not edit by hand.",
        "",
        f"Python {PYTHON_VERSION} itself is redistributed under the PSF License",
        "Agreement; its full text ships as python/LICENSE.txt beside this file.",
        "",
    ]

    named = 0
    for name, version in sorted(_lockfile_packages()):
        key = name.lower().replace("_", "-")
        if key in shipped and key in installed:
            licence = _licence_of(installed[key])
            lines.append(f"{name} {version} — shipped")
            lines.append(f"    licence: {licence or 'not declared in package metadata'}")
        elif key in shipped:
            #  In the locked set and not on disk: an environment marker kept it
            #  out. `uvloop` carries sys_platform != 'win32' and is the one
            #  this catches today. Saying "shipped" about a package the
            #  installer does not contain is the kind of small untruth a
            #  notice file exists to not have.
            lines.append(f"{name} {version} — not shipped on this platform")
            lines.append("    an environment marker excluded it from the install")
        elif key in EXCLUDED:
            lines.append(f"{name} {version} — not shipped, excluded on purpose")
            reason = EXCLUDED_REASONS.get(key, "see EXCLUDED in the build script")
            lines.append(f"    reason: {reason}")
        else:
            lines.append(f"{name} {version} — not shipped, development only")
            lines.append("    nothing is redistributed, so no licence is claimed here")
        lines.append("")
        named += 1

    (runtime / "THIRD-PARTY-NOTICES.txt").write_text("\n".join(lines), encoding="utf-8")
    log(f"third-party notices: {named} packages named")
    return named


def _lockfile_packages() -> list[tuple[str, str]]:
    """(name, version) for every package in uv.lock, workspace members aside.

    Parsed as text rather than with a TOML reader over `[[package]]` tables
    because that is all this needs and it keeps the build script free of a
    dependency of its own.
    """
    text = (REPO / "uv.lock").read_text(encoding="utf-8")
    packages: list[tuple[str, str]] = []
    name = None
    for raw in text.splitlines():
        line = raw.strip()
        if line == "[[package]]":
            name = None
        elif line.startswith("name = "):
            name = line.split("=", 1)[1].strip().strip('"')
        elif line.startswith("version = ") and name:
            version = line.split("=", 1)[1].strip().strip('"')
            #  Workspace members are this product, not a third party. The
            #  root package is plain `billgen`, which a `billgen-` prefix test
            #  misses — it was listed as an excluded third party until someone
            #  read the generated file.
            if name != "billgen" and not name.startswith("billgen-"):
                packages.append((name, version))
            name = None
    if not packages:
        raise SystemExit("uv.lock parsed to nothing — refusing to ship an empty notice file")
    return packages


def _licence_of(dist: Path | None) -> str | None:
    """The licence a package declares, from its METADATA."""
    if dist is None:
        return None
    metadata = dist / "METADATA"
    if not metadata.is_file():
        return None
    expression = None
    classifier = None
    for line in metadata.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith("License-Expression:"):
            expression = line.split(":", 1)[1].strip()
        elif line.startswith("License:") and not expression:
            value = line.split(":", 1)[1].strip()
            if value and len(value) < 120:
                expression = value
        elif line.startswith("Classifier: License ::"):
            classifier = line.split("::")[-1].strip()
        elif not line.strip():
            break
    return expression or classifier


def write_manifest(runtime: Path, bytecode: dict[str, int], notices: int) -> dict:
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
        "bytecode": bytecode,
        "third_party_notices": notices,
        "source_files_remaining": sum(1 for _ in runtime.rglob("*.py")),
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


def _already_compiled(runtime: Path) -> bool:
    manifest = runtime / "MANIFEST.json"
    if not manifest.is_file():
        return False
    try:
        return bool(json.loads(manifest.read_text(encoding="utf-8")).get("bytecode"))
    except (OSError, json.JSONDecodeError):
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--clean",
        action="store_true",
        help="rebuild from scratch rather than updating in place",
    )
    args = parser.parse_args()

    #  A compiled runtime cannot be built over. `prune` strips `.pyc`, pip
    #  skips packages whose dist-info says they are installed, and the sources
    #  were deleted by the previous run — so an incremental build over one
    #  leaves *empty package directories*, and every import becomes a namespace
    #  package resolving to nothing. That is what "cannot import name 'Field'
    #  from 'pydantic' (unknown location)" means, and it is how this was found.
    if RUNTIME.exists() and not args.clean and _already_compiled(RUNTIME):
        log("the runtime already ships bytecode and cannot be updated in place")
        args.clean = True

    if args.clean and RUNTIME.exists():
        log("removing the previous runtime")
        shutil.rmtree(RUNTIME)

    print(f"building the sidecar runtime in {RUNTIME.relative_to(REPO)}")
    archive = download_embeddable()
    unpack_interpreter(archive, RUNTIME / "python")
    requirements = install_dependencies(RUNTIME / "python")
    copy_application(RUNTIME / "app")
    prune(RUNTIME)
    notices = write_third_party_notices(RUNTIME, requirements)
    enable_sourceless_alembic(RUNTIME / "app")
    #  Last, so everything above still has its source to compile.
    bytecode = compile_to_bytecode(RUNTIME)
    manifest = write_manifest(RUNTIME, bytecode, notices)

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
