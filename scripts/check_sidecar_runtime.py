r"""Prove the bundled sidecar runtime is self-contained.

Run after `build_sidecar_runtime.py`, and before trusting any desktop build:

    python scripts/check_sidecar_runtime.py

The failure this exists for is not hypothetical. The first build of that
runtime enabled `import site` in the embeddable distribution's `._pth`, which
re-enables the *user* site directory — so the runtime imported the developer's
own `%APPDATA%\Roaming\Python\...` packages. It booted, answered `/healthz`,
and even rendered a PDF through a Playwright that was never bundled. Every one
of those results was a property of this laptop, not of the artifact, and the
first evidence would have been Emilia's install failing with an ImportError.

So the checks below are all the same shape: **is this answer a property of the
runtime, or of the machine it happens to be on?** Each runs the bundled
interpreter as a subprocess with the host's Python removed from PATH.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RUNTIME = REPO / "frontend-electron" / "src-tauri" / "runtime"
PYTHON = RUNTIME / "python" / "python.exe"
APP = RUNTIME / "app"

#  Every module the sidecar imports on the way to answering a request. A
#  runtime missing one of these fails at boot, which is the cheapest failure;
#  the expensive one is finding it on the host instead.
REQUIRED = [
    "fastapi",
    "uvicorn",
    "sqlalchemy",
    "alembic",
    "pydantic",
    "pydantic_settings",
    "jinja2",
    "jwt",
    "argon2",
    "structlog",
    "cryptography",
    "core",
    "db",
    "api",
    "desktop",
]

#  Declared somewhere in the workspace and deliberately not shipped. Finding
#  one means the runtime is reaching outside itself.
MUST_BE_ABSENT = ["playwright", "psycopg"]


def clean_environment() -> dict[str, str]:
    """The host's Python, as far out of the way as it can be put."""
    env = {
        key: value
        for key, value in os.environ.items()
        if key not in {"PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP"}
    }
    #  Belt as well as braces: the `._pth` already leaves site processing off,
    #  and this makes a future edit that turns it back on fail here rather than
    #  on a customer's machine.
    env["PYTHONNOUSERSITE"] = "1"
    env["PATH"] = os.pathsep.join([r"C:\Windows\system32", r"C:\Windows"])
    return env


def run_in_runtime(code: str) -> subprocess.CompletedProcess[str]:
    #  `check=False`: a non-zero exit is a result here, not an accident — half
    #  of these probes assert that an import fails.
    return subprocess.run(
        [str(PYTHON), "-c", code],
        cwd=APP,
        env=clean_environment(),
        capture_output=True,
        text=True,
        check=False,
    )


def check(name: str, ok: bool, detail: str = "") -> bool:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}")
    if detail:
        for line in detail.strip().splitlines():
            print(f"          {line}")
    return ok


def _lockfile_packages() -> list[tuple[str, str]]:
    """(name, version) from uv.lock, workspace members aside.

    Deliberately re-implemented here rather than imported from
    `build_sidecar_runtime`: this script exists to check that script's output,
    and a checker that shares the code under test agrees with it by
    construction.
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
            if name != "billgen" and not name.startswith("billgen-"):
                packages.append((name, version))
            name = None
    return packages


def main() -> int:
    if not PYTHON.is_file():
        print(f"no runtime at {PYTHON}")
        print("build it first: python scripts/build_sidecar_runtime.py")
        return 2

    print(f"checking {RUNTIME.relative_to(REPO)}\n")
    results = []

    probe = run_in_runtime(
        "import sys, json; print(json.dumps({'path': sys.path, 'prefix': sys.prefix}))"
    )
    if probe.returncode != 0:
        check("the interpreter runs at all", False, probe.stderr)
        return 1
    info = json.loads(probe.stdout)

    #  The one that caught the real bug.
    outside = [
        entry
        for entry in info["path"]
        if entry and not Path(entry).is_relative_to(RUNTIME)
    ]
    results.append(
        check(
            "sys.path stays inside the runtime",
            not outside,
            "\n".join(outside),
        )
    )

    for module in REQUIRED:
        found = run_in_runtime(
            f"import {module}, sys; print({module}.__file__ or sys.prefix)"
        )
        inside = found.returncode == 0 and Path(
            found.stdout.strip()
        ).is_relative_to(RUNTIME)
        results.append(
            check(
                f"{module} imports from the runtime",
                inside,
                found.stdout.strip() if found.returncode == 0 else found.stderr,
            )
        )

    for module in MUST_BE_ABSENT:
        missing = run_in_runtime(
            f"import {module}"
        )
        results.append(
            check(
                f"{module} is genuinely absent",
                missing.returncode != 0,
                "" if missing.returncode != 0 else "imported — the runtime is leaking",
            )
        )

    #  PDFs come from the installed Edge, printed from its own command line,
    #  with no Playwright in the runtime (T-21). On a machine with Edge the
    #  runtime must render; on one without, the API must still get a clean
    #  PdfEngineUnavailableError to turn into a 503 rather than a crash.
    pdf = run_in_runtime(
        "from core.pdf import html_to_pdf, PdfEngineUnavailableError\n"
        "from core.pdf.renderer import _edge_executable\n"
        "edge = 'EDGE' if _edge_executable() else 'NO-EDGE'\n"
        "try:\n"
        "    pdf = html_to_pdf('<html><body>x</body></html>')\n"
        "    print(edge, 'RENDERED' if pdf.startswith(b'%PDF') else 'NOT-A-PDF')\n"
        "except PdfEngineUnavailableError:\n"
        "    print(edge, 'UNAVAILABLE')\n"
    )
    outcome = pdf.stdout.strip()
    results.append(
        check(
            "PDFs render through the installed Edge, or fail cleanly without one (T-21)",
            outcome in {"EDGE RENDERED", "NO-EDGE UNAVAILABLE"},
            outcome or pdf.stderr,
        )
    )

    #  T-22. The runtime carries the public key, and knows it is a packaged
    #  build — those two together are what make the license requirement real.
    #  A build missing either starts unlicensed and nothing else notices.
    key = APP / "desktop" / "license_key.pub"
    results.append(
        check(
            "the license public key ships (T-22)",
            key.is_file(),
            ""
            if key.is_file()
            else (
                "no desktop/license_key.pub in the runtime — this build cannot\n"
                "verify a license and will refuse to start. Create the key pair\n"
                "once: python scripts/license_tool.py keygen "
                r"--private-key ..\billgen-license-key.pem"
            ),
        )
    )

    policy = run_in_runtime(
        "from desktop import bootstrap, licensing\n"
        "print(bootstrap.is_packaged(), bootstrap.license_is_required(),"
        " licensing.public_key() is not None)\n"
    )
    verdict = policy.stdout.strip()
    results.append(
        check(
            "the packaged build requires a license (T-22)",
            verdict == "True True True",
            verdict or policy.stderr,
        )
    )

    #  T-30. The build ships bytecode and no source, so the thing most likely
    #  to break is the thing that reads files by name rather than importing
    #  them — and that is Alembic. Its default mode matches `*.py` in
    #  `versions/`, so a bytecode-only build finds **zero revisions** and
    #  `upgrade head` succeeds against an empty database. Nothing errors; the
    #  first query does. This runs the migrations for real.
    migrated = run_in_runtime(
        "import os, tempfile, sqlite3, pathlib\n"
        "from alembic.config import Config\n"
        "from alembic import command\n"
        "from alembic.script import ScriptDirectory\n"
        "root = pathlib.Path.cwd()\n"
        "tmp = pathlib.Path(tempfile.mkdtemp()) / 'check.db'\n"
        "os.environ['DATABASE_URL'] = 'sqlite:///' + tmp.as_posix()\n"
        "cfg = Config(str(root / 'alembic.ini'))\n"
        "cfg.set_main_option('script_location', (root / 'db' / 'migrations').as_posix())\n"
        "heads = ScriptDirectory.from_config(cfg).get_heads()\n"
        "revisions = len(list(ScriptDirectory.from_config(cfg).walk_revisions()))\n"
        "command.upgrade(cfg, 'head')\n"
        "con = sqlite3.connect(tmp)\n"
        "q = \"select name from sqlite_master where type='table'\"\n"
        "tables = {r[0] for r in con.execute(q)}\n"
        "stamped = {r[0] for r in con.execute('select version_num from alembic_version')}\n"
        "same = sorted(heads) == sorted(stamped)\n"
        "print(revisions, same, 'invoices' in tables, 'documents' in tables)\n"
    )
    verdict = migrated.stdout.strip().split()
    ok = (
        len(verdict) == 4
        #  Not "more than zero": zero revisions is the exact failure this
        #  guards, and a guard that inspects a collection must also assert the
        #  collection is not empty (SOLO_RUN § What changed underneath us).
        and verdict[0].isdigit()
        and int(verdict[0]) >= 10
        and verdict[1:] == ["True", "True", "True"]
    )
    results.append(
        check(
            "migrations run from bytecode, and actually create the schema (T-30)",
            ok,
            migrated.stdout.strip() or migrated.stderr,
        )
    )

    #  T-30: no readable source in the build output. Also §11c, the short way —
    #  a build with no source ships no comments, and nothing was stripped out
    #  of the tree to achieve it.
    sources = [path for path in RUNTIME.rglob("*.py")]
    results.append(
        check(
            "the build output contains no .py (T-30)",
            not sources,
            "\n".join(str(path.relative_to(RUNTIME)) for path in sources[:10]),
        )
    )

    #  T-30: a redistributed build carries third-party licences it must name.
    notices = RUNTIME / "THIRD-PARTY-NOTICES.txt"
    named = notices.read_text(encoding="utf-8").splitlines() if notices.is_file() else []
    missing = [
        f"{name} {version}"
        for name, version in _lockfile_packages()
        if not any(line.startswith(f"{name} {version} ") for line in named)
    ]
    results.append(
        check(
            "every package in uv.lock is named in THIRD-PARTY-NOTICES.txt (T-30)",
            bool(named) and not missing,
            "\n".join(missing[:10]) if named else "no THIRD-PARTY-NOTICES.txt in the runtime",
        )
    )

    #  T-30's number. Not a guess: measured on what the installer will carry,
    #  before NSIS compresses it, so the real download is smaller than this.
    total = sum(
        path.stat().st_size for path in RUNTIME.rglob("*") if path.is_file()
    )
    results.append(
        check(
            "the runtime is under 120 MB before compression (T-30)",
            total < 120 * 1_000_000,
            f"{total / 1e6:.1f} MB",
        )
    )

    failed = results.count(False)
    print(f"\n{len(results) - failed}/{len(results)} checks passed")
    if failed:
        print("the runtime is not self-contained — do not ship it")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
