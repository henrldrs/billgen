r"""Per-machine data locations for the desktop build.

The data lives under **Documents**, not `%APPDATA%`. Under an MSIX package
Windows virtualises AppData into the package container and removes that
container when the package is uninstalled — which would take a seven-year
invoice series with it. Documents is somewhere a person can find, back up, and
keep after the app is gone. `core/pdf/renderer.py` records the same
virtualisation biting the browser cache.

Resolution order, first match wins:

1. ``BILLGEN_DATA_DIR`` — an explicit override, for dev, tests and CI.
2. The pointer file — the location first run recorded, because MSIX installs
   silently and cannot ask during setup.
3. An existing default directory — recovers a reinstall whose pointer went
   with the package container.
4. The default. Nothing has been chosen yet; first run will offer it.

The pointer itself is disposable: rule 3 is what makes losing it survivable.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

APP_DIR_NAME = "BillGen"
DATA_DIR_ENV = "BILLGEN_DATA_DIR"
POINTER_NAME = "data-directory"
LEGACY_MARKER_NAME = "MOVED.txt"

# What resolution rule produced the answer. The first-run screen and the
# settings panel both show the *resolved* path, so they need to say why.
SOURCE_ENV = "env"
SOURCE_POINTER = "pointer"
SOURCE_EXISTING = "existing"
SOURCE_DEFAULT = "default"


def default_data_dir() -> Path:
    """Where the data goes unless someone says otherwise."""
    return Path.home() / "Documents" / APP_DIR_NAME


def config_dir() -> Path:
    """Small, disposable per-user state — currently only the pointer file.

    Deliberately the platform's config location and not the data directory:
    the pointer has to be readable *before* the data directory is known.
    """
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = str(Path.home() / "Library" / "Application Support")
    else:
        base = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    return Path(base) / APP_DIR_NAME


def pointer_path() -> Path:
    return config_dir() / POINTER_NAME


def read_pointer() -> Path | None:
    """The recorded location, or None when there is none or it is unusable."""
    path = pointer_path()
    try:
        recorded = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return Path(recorded) if recorded else None


def write_pointer(directory: Path) -> Path:
    """Record the chosen data directory. Called by the first-run screen."""
    target = pointer_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(str(directory), encoding="utf-8")
    return target


def resolve_data_dir() -> tuple[Path, str]:
    """(directory, which rule chose it). See the module docstring."""
    override = os.environ.get(DATA_DIR_ENV)
    if override:
        return Path(override), SOURCE_ENV

    recorded = read_pointer()
    if recorded is not None:
        return recorded, SOURCE_POINTER

    default = default_data_dir()
    if default.exists():
        return default, SOURCE_EXISTING
    return default, SOURCE_DEFAULT


def app_data_dir() -> Path:
    return resolve_data_dir()[0]


def data_dir_source() -> str:
    return resolve_data_dir()[1]


def ensure_app_dir() -> Path:
    path = app_data_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def legacy_app_data_dir() -> Path:
    r"""Where the data used to live: %APPDATA%\BillGen and its XDG equivalents."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = str(Path.home() / "Library" / "Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(base) / APP_DIR_NAME


def migrate_legacy_data() -> Path | None:
    """Move an old %APPDATA% installation into the current data directory, once.

    Returns the destination when something moved, else None. Deliberately
    one-way and deliberately refusing to merge: two directories both holding a
    gapless invoice series, with edits landing in whichever the app opened
    last, is a worse failure than an install that will not start. So a target
    that already has a database is left completely alone.

    Skipped entirely when BILLGEN_DATA_DIR is set — a developer pointing the
    app at a scratch directory has not asked for their real data to be moved.
    """
    if os.environ.get(DATA_DIR_ENV):
        return None

    legacy = legacy_app_data_dir()
    target = app_data_dir()
    if legacy == target or not (legacy / "billgen.db").exists():
        return None
    if (target / "billgen.db").exists():
        return None

    target.mkdir(parents=True, exist_ok=True)
    for entry in legacy.iterdir():
        if entry.name == LEGACY_MARKER_NAME:
            continue
        destination = target / entry.name
        if destination.exists():
            continue
        shutil.move(str(entry), str(destination))

    (legacy / LEGACY_MARKER_NAME).write_text(
        f"BillGen's data moved to {target}\n"
        "This folder is no longer read. It is safe to delete.\n",
        encoding="utf-8",
    )
    return target


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
