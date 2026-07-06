"""Desktop API sidecar entrypoint.

Run by the Tauri shell as `python -m desktop.bootstrap`. Resolves the per-machine
SQLite path, runs migrations, then serves the FastAPI app on a free localhost
port. The chosen port is printed to stdout as `BILLGEN_SIDECAR port=NNNNN` so the
shell can discover it, then poll /healthz until ready."""

from __future__ import annotations

import os
import secrets
import socket
from pathlib import Path

from alembic import command
from alembic.config import Config

from . import paths

ROOT = Path(__file__).resolve().parents[1]


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
    prepare_database(database_url)

    chosen = port or find_free_port()
    # marker line for the shell, flushed before the server blocks the process
    print(f"BILLGEN_SIDECAR port={chosen}", flush=True)

    import uvicorn  # deferred: import after env is configured

    uvicorn.run("api.main:app", host="127.0.0.1", port=chosen, log_level="info")


def main() -> None:  # pragma: no cover
    env_port = os.environ.get("BILLGEN_SIDECAR_PORT")
    run(int(env_port) if env_port else None)


if __name__ == "__main__":  # pragma: no cover
    main()
