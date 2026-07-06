r"""Per-machine data locations for the desktop build.

Windows (the ship target): %APPDATA%\BillGen. Other OSes get XDG-ish paths so
tests and dev on non-Windows still work."""

import os
import sys
from pathlib import Path

APP_DIR_NAME = "BillGen"


def app_data_dir() -> Path:
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = str(Path.home() / "Library" / "Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    path = Path(base) / APP_DIR_NAME
    return path


def ensure_app_dir() -> Path:
    path = app_data_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def database_path() -> Path:
    return app_data_dir() / "billgen.db"


def database_url() -> str:
    # forward slashes: SQLAlchemy URLs use them on every platform
    return f"sqlite:///{database_path().as_posix()}"


def log_path() -> Path:
    return app_data_dir() / "billgen.log"


def secret_path() -> Path:
    return app_data_dir() / "jwt.secret"


def license_path() -> Path:
    return app_data_dir() / "license.billgenlic"
