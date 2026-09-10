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

    #  The PDF engine is expected to be unavailable, and the API turns that
    #  into a 503 rather than a crash. Asserting the *clean* failure is the
    #  point: T-21 decides what renders a PDF on the desktop.
    pdf = run_in_runtime(
        "from core.pdf import html_to_pdf, PdfEngineUnavailableError\n"
        "try:\n"
        "    html_to_pdf('<html><body>x</body></html>')\n"
        "    print('RENDERED')\n"
        "except PdfEngineUnavailableError as exc:\n"
        "    print('UNAVAILABLE')\n"
    )
    results.append(
        check(
            "the PDF engine fails cleanly rather than crashing (T-21)",
            pdf.stdout.strip() == "UNAVAILABLE",
            pdf.stdout.strip() or pdf.stderr,
        )
    )

    failed = results.count(False)
    print(f"\n{len(results) - failed}/{len(results)} checks passed")
    if failed:
        print("the runtime is not self-contained — do not ship it")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
