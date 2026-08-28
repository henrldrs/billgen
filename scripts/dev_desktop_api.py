"""Run the API in desktop mode against a throwaway database.

Why this exists: verifying a screen in a browser needs a signed-in session, and
the only credential-less way in is POST /auth/desktop-bootstrap, which the API
404s unless desktop_mode is on. Rather than flip that on a shared dev server,
this starts a SECOND API on its own port with its own SQLite file, so nothing
here can touch var/billgen.dev.db or the account you use day to day.

Hosting this is impossible by construction: api/config.py raises
ConfigurationError when desktop_mode is true on a production start
(tests/api/test_config_guards.py::test_production_refuses_desktop_mode).

    python scripts/dev_desktop_api.py
    npm --workspace @billgen/saas run dev:desktop

The paired Vite target reads frontend-saas/.env.desktopdev, which points
VITE_API_URL here.
"""

import os
import pathlib
import sys
from pathlib import Path

# Run as `python scripts/dev_desktop_api.py` from anywhere: put the repo root on
# the path so core/, api/ and db/ import the same way they do under pytest.
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
os.chdir(REPO)

HOST = "127.0.0.1"
PORT = 8010
SAAS_ORIGIN = "http://localhost:5183"
DB = "sqlite:///./var/billgen.desktopdev.db"

os.environ.setdefault("DESKTOP_MODE", "true")
os.environ.setdefault("DATABASE_URL", DB)
os.environ.setdefault("CORS_ORIGINS", f"{SAAS_ORIGIN},http://127.0.0.1:5183")
os.environ.setdefault("ENVIRONMENT", "dev")

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import inspect  # noqa: E402

from db.engine import make_engine  # noqa: E402  (must follow the env setup)


def _alembic_config() -> Config:
    root = pathlib.Path(__file__).resolve().parent.parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "db" / "migrations"))
    config.set_main_option("sqlalchemy.url", DB)
    return config


def main() -> None:
    import uvicorn  # noqa: PLC0415 - deferred so `--help` works without the server extra

    # Alembic, not create_all.
    #
    # `create_all` was the original choice because this database is disposable.
    # The trouble is that it creates *missing tables* and never alters existing
    # ones, so a schema change to a table that already exists silently does not
    # happen here — and the failure surfaces as a 500 from a running app rather
    # than as anything a test could catch. That bit twice in one afternoon:
    # `invoices.template_snapshot` and then the templates' unique constraint.
    #
    # Running the migrations means this database and a hosted one are built the
    # same way, which is also the only way the migrations get exercised outside
    # a scratch file nobody keeps.
    engine = make_engine(DB)
    inspector = inspect(engine)
    if not inspector.has_table("alembic_version") and inspector.has_table("invoices"):
        # A database built by the old create_all path has every table and no
        # revision. Stamp it so the migrations that follow are the only ones
        # that run; an empty database just gets built from nothing instead.
        print("stamping a pre-Alembic dev database; delete it if migrations fail")
        command.stamp(_alembic_config(), "head")
    engine.dispose()
    command.upgrade(_alembic_config(), "head")

    print(f"desktop-mode API on http://{HOST}:{PORT} · db {DB}")
    uvicorn.run("api.main:app", host=HOST, port=PORT)


if __name__ == "__main__":
    main()
