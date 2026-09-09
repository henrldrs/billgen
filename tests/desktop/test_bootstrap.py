import socket

from sqlalchemy import create_engine, inspect

from desktop import bootstrap, paths


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
    for key in ("DATABASE_URL", "DESKTOP_MODE", "JWT_SECRET"):
        monkeypatch.delenv(key, raising=False)

    url = bootstrap.configure_environment()

    import os

    assert url.endswith("BillGen/billgen.db")
    assert os.environ["DATABASE_URL"] == url
    assert os.environ["DESKTOP_MODE"] == "true"
    assert len(os.environ["JWT_SECRET"]) == 64
