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

from db.engine import make_engine  # noqa: E402  (must follow the env setup)
from db.models import Base  # noqa: E402


def main() -> None:
    import uvicorn  # noqa: PLC0415 - deferred so `--help` works without the server extra

    # The dev DB is disposable, so create the schema directly rather than
    # running Alembic. Never do this against a database you care about:
    # create_all knows the current models and nothing about migration history.
    engine = make_engine(DB)
    Base.metadata.create_all(engine)
    engine.dispose()

    print(f"desktop-mode API on http://{HOST}:{PORT} · db {DB}")
    uvicorn.run("api.main:app", host=HOST, port=PORT)


if __name__ == "__main__":
    main()
