"""Desktop API sidecar entrypoint.

Run by the Tauri shell as `python -m desktop.bootstrap`. Resolves the per-machine
SQLite path, runs migrations, then serves the FastAPI app on a free localhost
port. The chosen port is printed to stdout as `BILLGEN_SIDECAR port=NNNNN` so the
shell can discover it, then poll /healthz until ready.

It is also where the license is enforced (T-22). A packaged build refuses to
serve without a valid one; a development checkout runs under grace. Enforcement
lives here rather than in the API because a sidecar that has already bound a
port is a sidecar that is already answering requests."""

from __future__ import annotations

import os
import secrets
import socket
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

from . import licensing, paths

ROOT = Path(__file__).resolve().parents[1]

#  `1`/`true`/`yes` forces the strict policy on, `0`/`false`/`no` forces it off.
#  Unset means "decide from the build", which is the only setting a customer
#  ever runs under — the override exists so the packaged behaviour can be
#  rehearsed from a checkout, and so a rescue build can be started without one.
REQUIRE_LICENSE_ENV = "BILLGEN_REQUIRE_LICENSE"
_TRUE = {"1", "true", "yes", "on"}
_FALSE = {"0", "false", "no", "off"}


def is_packaged() -> bool:
    """True when running under the runtime the installer carries.

    `scripts/build_sidecar_runtime.py` assembles `runtime/python/` beside
    `runtime/app/` and writes `runtime/MANIFEST.json`; this module runs from
    `app/desktop/`. Both halves are asserted — the interpreter being *inside*
    the runtime is what separates a packaged boot from a developer who happens
    to have pointed `BILLGEN_ROOT` at an unpacked build.
    """
    runtime = ROOT.parent
    if not (runtime / "MANIFEST.json").is_file():
        return False
    try:
        return Path(sys.executable).resolve().is_relative_to(runtime)
    except (OSError, ValueError):
        return False


def license_is_required() -> bool:
    override = os.environ.get(REQUIRE_LICENSE_ENV, "").strip().lower()
    if override in _TRUE:
        return True
    if override in _FALSE:
        return False
    return is_packaged()


def enforce_license() -> licensing.LicenseInfo | None:
    """Apply the boot-time policy. Raises LicenseError when the app must not
    start; returns the license when there is one, or None under grace."""
    return licensing.check_license(
        paths.license_path(),
        licensing.public_key(),
        require_license=license_is_required(),
    )


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def load_or_create_secret() -> str:
    """Persist a JWT secret so tokens survive restarts. 64 hex chars (32 bytes)
    comfortably exceeds the HS256 minimum."""
    path = paths.secret_path()
    if path.exists():
        existing = path.read_text(encoding="utf-8").strip()
        if existing:
            return existing
    secret = secrets.token_hex(32)
    path.write_text(secret, encoding="utf-8")
    return secret


def prepare_database(database_url: str) -> None:
    """Run Alembic migrations to head against `database_url`."""
    os.environ["DATABASE_URL"] = database_url
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", (ROOT / "db" / "migrations").as_posix())
    command.upgrade(cfg, "head")


def configure_environment() -> str:
    """Set env for the API process (DB, secret, desktop mode). Returns the db url."""
    paths.ensure_app_dir()
    # An install that predates the move out of %APPDATA% carries its database
    # there. One-way, and a no-op on every run after the first (T-25).
    paths.migrate_legacy_data()
    database_url = paths.database_url()
    os.environ["DATABASE_URL"] = database_url
    os.environ["DESKTOP_MODE"] = "true"
    os.environ.setdefault("JWT_SECRET", load_or_create_secret())
    # Desktop webview loads from tauri://localhost (and http://localhost in dev).
    os.environ.setdefault(
        "CORS_ORIGINS", "http://localhost:1420,http://127.0.0.1:1420,tauri://localhost"
    )
    return database_url


def run(port: int | None = None) -> None:  # pragma: no cover - process entrypoint
    database_url = configure_environment()

    #  Before the migrations and before the port: nothing about an unlicensed
    #  start should touch the customer's database.
    try:
        info = enforce_license()
    except licensing.LicenseError as exc:
        #  stderr, and a marker the shell can show verbatim. The Tauri side
        #  only ever reports "sidecar did not report a port", which tells a
        #  person nothing about what to do next.
        print(f"BILLGEN_LICENSE error={exc}", file=sys.stderr, flush=True)
        raise SystemExit(2) from exc
    if info is not None:
        print(f"BILLGEN_LICENSE ok plan={info.plan} email={info.email}", flush=True)

    prepare_database(database_url)

    chosen = port or find_free_port()
    # marker line for the shell, flushed before the server blocks the process
    print(f"BILLGEN_SIDECAR port={chosen}", flush=True)

    import uvicorn  # noqa: PLC0415 — deferred: import after env is configured

    uvicorn.run("api.main:app", host="127.0.0.1", port=chosen, log_level="info")


def main() -> None:  # pragma: no cover
    env_port = os.environ.get("BILLGEN_SIDECAR_PORT")
    run(int(env_port) if env_port else None)


if __name__ == "__main__":  # pragma: no cover
    main()
