"""Where the desktop build keeps its data, and how it gets there.

The reason these are worth six tests rather than one: under an MSIX package
`%APPDATA%` is virtualised into the package container and deleted with it, so
the resolution order below is what stands between an uninstall and a lost
invoice series (T-25).
"""

import pytest

from desktop import paths


@pytest.fixture(autouse=True)
def _isolated_home(tmp_path, monkeypatch):
    """A home of our own. Both variables: `Path.home()` reads USERPROFILE on
    Windows and HOME everywhere else, and the suite runs on both."""
    home = tmp_path / "home"
    (home / "Documents").mkdir(parents=True)
    for key in ("HOME", "USERPROFILE"):
        monkeypatch.setenv(key, str(home))
    monkeypatch.setenv("APPDATA", str(home / "AppData" / "Roaming"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.setenv("XDG_DATA_HOME", str(home / ".local" / "share"))
    monkeypatch.delenv(paths.DATA_DIR_ENV, raising=False)
    return home


def test_the_default_is_documents_never_appdata(_isolated_home):
    directory, source = paths.resolve_data_dir()

    assert directory == _isolated_home / "Documents" / "BillGen"
    assert source == paths.SOURCE_DEFAULT
    # The whole point: nothing the package container can swallow.
    assert paths.legacy_app_data_dir() not in directory.parents
    assert directory != paths.legacy_app_data_dir()


def test_the_pointer_wins_over_the_default_and_the_env_wins_over_both(
    _isolated_home, tmp_path, monkeypatch
):
    chosen = tmp_path / "D_drive" / "BillGen"
    paths.write_pointer(chosen)
    assert paths.resolve_data_dir() == (chosen, paths.SOURCE_POINTER)

    override = tmp_path / "scratch"
    monkeypatch.setenv(paths.DATA_DIR_ENV, str(override))
    assert paths.resolve_data_dir() == (override, paths.SOURCE_ENV)


def test_an_existing_default_survives_a_lost_pointer(_isolated_home):
    """Uninstalling an MSIX package takes the pointer with the container. The
    data does not go with it, so the next install has to find it again."""
    paths.default_data_dir().mkdir(parents=True)

    directory, source = paths.resolve_data_dir()

    assert directory == paths.default_data_dir()
    assert source == paths.SOURCE_EXISTING


def test_legacy_data_moves_once_and_only_into_an_empty_target(_isolated_home):
    legacy = paths.legacy_app_data_dir()
    legacy.mkdir(parents=True)
    (legacy / "billgen.db").write_text("old", encoding="utf-8")
    (legacy / "jwt.secret").write_text("secret", encoding="utf-8")

    moved = paths.migrate_legacy_data()

    assert moved == paths.default_data_dir()
    assert (moved / "billgen.db").read_text(encoding="utf-8") == "old"
    assert (moved / "jwt.secret").read_text(encoding="utf-8") == "secret"
    assert not (legacy / "billgen.db").exists()
    # A note where the data used to be, so a person looking there is not lost.
    assert str(moved) in (legacy / paths.LEGACY_MARKER_NAME).read_text(encoding="utf-8")

    # Second run: nothing left to move, and nothing pretends otherwise.
    assert paths.migrate_legacy_data() is None


def test_a_target_that_already_has_a_database_is_never_merged(_isolated_home):
    """Two directories holding the same gapless series, with writes landing in
    whichever was opened last, is worse than an install that will not start."""
    legacy = paths.legacy_app_data_dir()
    legacy.mkdir(parents=True)
    (legacy / "billgen.db").write_text("old", encoding="utf-8")
    target = paths.default_data_dir()
    target.mkdir(parents=True)
    (target / "billgen.db").write_text("current", encoding="utf-8")

    assert paths.migrate_legacy_data() is None
    assert (target / "billgen.db").read_text(encoding="utf-8") == "current"
    assert (legacy / "billgen.db").read_text(encoding="utf-8") == "old"


def test_an_explicit_override_never_moves_the_real_data(_isolated_home, monkeypatch):
    legacy = paths.legacy_app_data_dir()
    legacy.mkdir(parents=True)
    (legacy / "billgen.db").write_text("real", encoding="utf-8")
    monkeypatch.setenv(paths.DATA_DIR_ENV, str(legacy.parent / "scratch"))

    assert paths.migrate_legacy_data() is None
    assert (legacy / "billgen.db").exists()
