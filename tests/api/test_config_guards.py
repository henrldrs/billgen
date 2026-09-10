"""Boot-time config guards: a hosted (ENVIRONMENT=production) start must refuse
dev-grade secrets and desktop_mode; survivable misconfig only warns; dev stays
permissive so local workflows are untouched."""

import pytest

from api.config import ConfigurationError, Settings, validate_for_boot
from api.main import create_app
from db.engine import make_engine
from db.models import Base

GOOD_SECRET = "a-real-production-secret-0123456789abcdef"


def make_settings(**overrides) -> Settings:
    base = {
        "database_url": "sqlite://",
        "jwt_secret": GOOD_SECRET,
        "cors_origins": "https://app.billgen.be",
    }
    base.update(overrides)
    return Settings(**base)


def test_production_refuses_dev_jwt_secret():
    settings = make_settings(
        environment="production",
        jwt_secret="dev-only-secret-change-me-0123456789abcdef",
    )
    with pytest.raises(ConfigurationError, match="dev default"):
        validate_for_boot(settings)


def test_production_refuses_short_jwt_secret():
    settings = make_settings(environment="production", jwt_secret="too-short")
    with pytest.raises(ConfigurationError, match="32 bytes"):
        validate_for_boot(settings)


def test_production_refuses_desktop_mode():
    settings = make_settings(environment="production", desktop_mode=True)
    with pytest.raises(ConfigurationError, match="desktop_mode"):
        validate_for_boot(settings)


def test_production_warns_on_dev_cors_and_sqlite():
    settings = make_settings(
        environment="production",
        cors_origins="http://localhost:5173,https://app.billgen.be",
        database_url="sqlite:///./var/billgen.dev.db",
    )
    warnings = validate_for_boot(settings)
    assert any("localhost" in w for w in warnings)
    assert any("SQLite" in w for w in warnings)


def test_production_warns_on_wildcard_cors():
    settings = make_settings(environment="production", cors_origins="*")
    warnings = validate_for_boot(settings)
    assert any("every origin" in w for w in warnings)


def test_clean_production_config_boots_without_warnings():
    settings = make_settings(
        environment="production",
        database_url="postgresql+psycopg://billgen:billgen@db:5432/billgen",
        #  A hosted start with nowhere to put issued documents is a warning,
        #  not a clean config: the seven-year retention duty would rest on the
        #  database alone (T-27).
        document_root="/srv/billgen/documents",
    )
    assert validate_for_boot(settings) == []


def test_dev_keeps_booting_on_dev_secret_but_warns():
    settings = make_settings(jwt_secret="dev-only-secret-change-me-0123456789abcdef")
    warnings = validate_for_boot(settings)
    assert any("dev jwt_secret default" in w for w in warnings)


def test_create_app_refuses_to_boot_on_fatal_production_misconfig():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    settings = make_settings(
        environment="production",
        jwt_secret="dev-only-secret-change-me-0123456789abcdef",
    )
    with pytest.raises(ConfigurationError):
        create_app(settings=settings, engine=engine)


def test_create_app_boots_in_dev_with_defaults():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    settings = make_settings(jwt_secret="dev-only-secret-change-me-0123456789abcdef")
    app = create_app(settings=settings, engine=engine)
    assert app.title == "BillGen API"
