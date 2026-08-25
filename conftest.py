"""Shared test-database wiring.

The suite runs on in-memory SQLite by default: fast, zero setup, and what a
workstation gets from `python -m pytest tests`. Setting TEST_DATABASE_URL
points the same suite at another engine — CI uses it to run everything a
second time against Postgres (ADR-0004).

That second run is not ceremony. The two engines diverge exactly where this
product is least willing to be wrong: gapless invoice numbering advances its
counter under `.with_for_update()` (db/repositories/sqlalchemy_repositories.py),
a real row lock on Postgres. The SQLite test DB is `sqlite://` behind a
StaticPool — one connection, no concurrency — so a green SQLite run says
nothing about whether that lock holds on the engine production actually runs.
Postgres is also stricter about types and constraint timing than SQLite, which
is a second class of bug SQLite-only testing cannot see.
"""

import os

from sqlalchemy.engine import Engine

from db.engine import make_engine
from db.models import Base

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")

_IS_SQLITE = TEST_DATABASE_URL.startswith("sqlite")


def make_test_engine() -> Engine:
    """A fresh engine with an empty schema.

    Each `sqlite://` engine is its own private database, so isolation is free.
    A shared Postgres is not: tables survive the test that made them, and a
    crashed run leaves them behind — so drop before creating.
    """
    engine = make_engine(TEST_DATABASE_URL)
    if not _IS_SQLITE:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return engine


def dispose_test_engine(engine: Engine) -> None:
    """Tear the schema down so the next test starts clean (Postgres only)."""
    if not _IS_SQLITE:
        Base.metadata.drop_all(engine)
    engine.dispose()
