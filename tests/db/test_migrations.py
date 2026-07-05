"""Phase 3 exit criterion — alembic upgrade head / downgrade base round-trips clean."""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

ROOT = Path(__file__).resolve().parents[2]

EXPECTED_TABLES = {
    "audit_log",
    "clients",
    "companies",
    "credit_note_lines",
    "credit_notes",
    "invoice_lines",
    "invoices",
    "org_memberships",
    "organizations",
    "payments",
    "products",
    "sequences",
    "subscriptions",
    "users",
}


@pytest.fixture()
def alembic_config(tmp_path, monkeypatch):
    db_path = tmp_path / "migration_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", (ROOT / "db" / "migrations").as_posix())
    return cfg, db_path


def _tables(db_path: Path) -> set[str]:
    engine = create_engine(f"sqlite:///{db_path.as_posix()}")
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def test_upgrade_downgrade_roundtrip(alembic_config):
    cfg, db_path = alembic_config

    command.upgrade(cfg, "head")
    after_upgrade = _tables(db_path)
    assert EXPECTED_TABLES <= after_upgrade

    command.downgrade(cfg, "base")
    after_downgrade = _tables(db_path)
    assert after_downgrade & EXPECTED_TABLES == set()

    command.upgrade(cfg, "head")
    assert EXPECTED_TABLES <= _tables(db_path)


def test_every_business_table_has_organization_id(alembic_config):
    cfg, db_path = alembic_config
    command.upgrade(cfg, "head")

    engine = create_engine(f"sqlite:///{db_path.as_posix()}")
    try:
        inspector = inspect(engine)
        # users are global (they authenticate before a tenant is bound);
        # organizations is the tenant itself.
        exempt = {"alembic_version", "users", "organizations"}
        for table in set(inspector.get_table_names()) - exempt:
            columns = {col["name"] for col in inspector.get_columns(table)}
            assert "organization_id" in columns, f"{table} is missing organization_id"
    finally:
        engine.dispose()
