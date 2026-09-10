import json
import socket

import pytest
from sqlalchemy import create_engine, inspect

from desktop import bootstrap, licensing, paths


def test_find_free_port_is_bindable():
    port = bootstrap.find_free_port()
    assert 1024 < port < 65536
    # the port was released, so we can bind it again
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", port))


def test_prepare_database_migrates_to_head(tmp_path, monkeypatch):
    db_path = tmp_path / "desktop.db"
    url = f"sqlite:///{db_path.as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)

    bootstrap.prepare_database(url)

    engine = create_engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert {"invoices", "user_credentials", "refresh_tokens", "sequences"} <= tables


def test_app_data_paths_follow_the_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("BILLGEN_DATA_DIR", str(tmp_path / "BillGen"))
    assert paths.app_data_dir() == tmp_path / "BillGen"
    assert paths.database_url().startswith("sqlite:///")
    assert paths.database_url().endswith("BillGen/billgen.db")


def test_load_or_create_secret_is_stable(tmp_path, monkeypatch):
    monkeypatch.setenv("BILLGEN_DATA_DIR", str(tmp_path / "BillGen"))
    paths.ensure_app_dir()
    first = bootstrap.load_or_create_secret()
    second = bootstrap.load_or_create_secret()
    assert first == second
    assert len(first) == 64  # 32 bytes hex


def test_configure_environment_sets_desktop_env(tmp_path, monkeypatch):
    monkeypatch.setenv("BILLGEN_DATA_DIR", str(tmp_path / "BillGen"))
    for key in ("DATABASE_URL", "DESKTOP_MODE", "JWT_SECRET", "DOCUMENT_ROOT"):
        monkeypatch.delenv(key, raising=False)

    url = bootstrap.configure_environment()

    import os

    assert url.endswith("BillGen/billgen.db")
    assert os.environ["DATABASE_URL"] == url
    assert os.environ["DESKTOP_MODE"] == "true"
    assert len(os.environ["JWT_SECRET"]) == 64
    #  The wire between T-25 and T-27: documents land inside the data
    #  directory, so an uninstall leaves the database and the PDFs together.
    assert os.environ["DOCUMENT_ROOT"] == str(tmp_path / "BillGen")


# --- the license gate (T-22) ------------------------------------------------
#
# `check_license` was a tested library nothing called; these are the tests for
# the calling, which is the half that decides whether a build is licensed.

MACHINE = "aaaabbbbccccddddeeeeffff00001111"


@pytest.fixture()
def desktop_env(tmp_path, monkeypatch):
    """A data directory, a key pair, and a known fingerprint."""
    monkeypatch.setenv("BILLGEN_DATA_DIR", str(tmp_path / "BillGen"))
    monkeypatch.setenv(licensing.MACHINE_ID_ENV, MACHINE)
    monkeypatch.delenv(bootstrap.REQUIRE_LICENSE_ENV, raising=False)
    private_pem, public_pem = licensing.generate_keypair()
    key = tmp_path / "license_key.pub"
    key.write_bytes(public_pem)
    monkeypatch.setenv(licensing.PUBLIC_KEY_ENV, str(key))
    paths.ensure_app_dir()
    return private_pem


def _install_license(private_pem, **overrides):
    payload = {
        "email": "emilia@example.com",
        "plan": "business",
        "expires": None,
        "hardware_id": MACHINE,
    }
    payload.update(overrides)
    document = licensing.sign_license(payload, private_pem)
    path = paths.license_path()
    path.write_text(json.dumps(document), encoding="utf-8")
    return path


def test_license_not_required_in_a_checkout(desktop_env):
    assert bootstrap.is_packaged() is False
    assert bootstrap.license_is_required() is False


def test_require_license_env_overrides_both_ways(desktop_env, monkeypatch):
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "1")
    assert bootstrap.license_is_required() is True
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "false")
    assert bootstrap.license_is_required() is False


def test_grace_starts_without_a_license(desktop_env):
    assert bootstrap.enforce_license() is None


def test_packaged_build_refuses_without_a_license(desktop_env, monkeypatch):
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "1")
    with pytest.raises(licensing.LicenseError, match="No license file"):
        bootstrap.enforce_license()


def test_packaged_build_starts_with_one(desktop_env, monkeypatch):
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "1")
    _install_license(desktop_env)
    info = bootstrap.enforce_license()
    assert info is not None
    assert info.email == "emilia@example.com"
    assert info.plan == "business"


def test_a_license_for_another_machine_is_refused(desktop_env, monkeypatch):
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "1")
    _install_license(desktop_env, hardware_id="99998888777766665555444433332222")
    with pytest.raises(licensing.LicenseError, match="different machine"):
        bootstrap.enforce_license()


def test_it_fails_closed_when_the_build_carries_no_public_key(
    desktop_env, tmp_path, monkeypatch
):
    """A build packaged without the key must refuse, not shrug and serve."""
    monkeypatch.setenv(bootstrap.REQUIRE_LICENSE_ENV, "1")
    monkeypatch.setenv(licensing.PUBLIC_KEY_ENV, str(tmp_path / "absent.pub"))
    _install_license(desktop_env)
    with pytest.raises(licensing.LicenseError, match="no public key"):
        bootstrap.enforce_license()


def test_the_license_lives_in_the_data_directory(desktop_env, tmp_path):
    # not %APPDATA%: it survives an MSIX uninstall with the database (T-25)
    assert paths.license_path().parent == tmp_path / "BillGen"
