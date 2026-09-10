"""The unasked-for backup (T-23).

What is asserted here is the archive and the rotation. What is *not* — and
cannot be, from a test — is that a restore from one of these files brings a
real machine back. That rehearsal is the rest of T-23 and it happens on
Emilia's laptop, because a restore that has only ever been tested against a
database the test made is a belief, not a guarantee.
"""

import json
from datetime import date
from uuid import UUID, uuid4
from zipfile import ZipFile

import pytest

from core.models import Organization
from db.engine import make_engine
from db.models import Base
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory
from desktop import backups


@pytest.fixture()
def database(tmp_path):
    """A file-backed SQLite database with one organization in it.

    A file, not `sqlite://`: `write_backup` opens its own engine from a URL,
    the way the sidecar does, and an in-memory database would not survive
    crossing that boundary.
    """
    url = f"sqlite:///{(tmp_path / 'billgen.db').as_posix()}"
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    org_id = uuid4()
    session_factory = make_session_factory(engine)
    with SqlAlchemyUnitOfWork(session_factory) as uow:
        uow.organizations.add(Organization(id=org_id, name="Emilia SRL"))
        uow.commit()
    engine.dispose()
    return url, org_id


def test_the_archive_holds_a_restorable_export_per_organization(tmp_path, database):
    url, org_id = database

    written = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))

    assert written == tmp_path / "backups" / "2026-09-11.zip"
    with ZipFile(written) as archive:
        manifest = json.loads(archive.read("MANIFEST.json"))
        assert manifest["format"] == "billgen-daily-backup"
        assert manifest["documents_included"] is False
        entry = manifest["organizations"][0]
        assert entry["organization_id"] == str(org_id)
        assert entry["name"] == "Emilia SRL"

        payload = json.loads(archive.read(entry["file"]))

    #  The member is exactly what POST /backup/restore accepts, which is the
    #  only property of this file that matters on the day it is needed.
    assert payload["format"] == "billgen-backup"
    assert payload["schema_version"] == entry["schema_version"]
    assert payload["organization"]["id"] == str(org_id)


def test_a_second_start_the_same_day_leaves_the_morning_archive_alone(tmp_path, database):
    """The start-of-day rule: today is already covered, so the previous
    session's state is not overwritten by a relaunch five minutes later."""
    url, _ = database
    first = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))
    first.write_bytes(b"the morning archive")

    again = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))

    assert again is None
    assert first.read_bytes() == b"the morning archive"


def test_a_clean_shutdown_replaces_todays_archive(tmp_path, database):
    url, _ = database
    first = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))
    first.write_bytes(b"the morning archive")

    again = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11), overwrite=True)

    assert again == first
    with ZipFile(first) as archive:
        assert "MANIFEST.json" in archive.namelist()


def test_an_empty_database_is_not_backed_up(tmp_path):
    """A database migrated but never signed into. An empty archive would start
    the retention clock on nothing and push a real one out of the window."""
    url = f"sqlite:///{(tmp_path / 'empty.db').as_posix()}"
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    engine.dispose()

    assert backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11)) is None
    assert not (tmp_path / "backups").exists()


def test_rotation_keeps_the_newest_thirty(tmp_path):
    folder = tmp_path / "backups"
    folder.mkdir()
    for day in range(1, 41):
        (folder / f"2026-08-{day:02d}.zip").write_bytes(b"x")

    removed = backups.prune(folder, keep=30)

    assert len(removed) == 10
    survivors = sorted(entry.name for entry in folder.iterdir())
    assert survivors[0] == "2026-08-11.zip"
    assert survivors[-1] == "2026-08-40.zip"


def test_rotation_never_touches_a_file_it_did_not_write(tmp_path):
    """Somebody's own copy, dropped in the same folder. It must be there next
    month — a backup folder that eats files is not a backup folder."""
    folder = tmp_path / "backups"
    folder.mkdir()
    for day in range(1, 41):
        (folder / f"2026-08-{day:02d}.zip").write_bytes(b"x")
    theirs = folder / "before-the-accountant-called.zip"
    theirs.write_bytes(b"mine")

    backups.prune(folder, keep=30)

    assert theirs.exists()


def test_writing_prunes_as_it_goes(tmp_path, database):
    url, _ = database
    folder = tmp_path / "backups"
    folder.mkdir()
    for day in range(1, 31):
        (folder / f"2026-08-{day:02d}.zip").write_bytes(b"x")

    backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))

    remaining = sorted(entry.name for entry in folder.iterdir())
    assert len(remaining) == 30
    assert remaining[-1] == "2026-09-11.zip"
    assert "2026-08-01.zip" not in remaining


def test_a_partial_write_is_never_left_where_rotation_can_count_it(tmp_path, database):
    url, _ = database
    written = backups.write_backup(url, data_dir=tmp_path, day=date(2026, 9, 11))
    assert [entry.name for entry in written.parent.iterdir()] == ["2026-09-11.zip"]


def test_the_backup_is_rooted_in_the_resolved_data_directory(tmp_path, monkeypatch):
    """T-25 chose where the data lives; the backups live inside it, so an
    uninstall leaves the database, the invoices and the backups together."""
    monkeypatch.setenv("BILLGEN_DATA_DIR", str(tmp_path / "BillGen"))
    assert backups.backups_dir() == tmp_path / "BillGen" / "backups"
    assert backups.archive_path(date(2026, 9, 11)) == (
        tmp_path / "BillGen" / "backups" / "2026-09-11.zip"
    )


def test_the_organization_query_finds_what_is_there(tmp_path, database):
    url, org_id = database
    engine = make_engine(url)
    try:
        found = backups._organization_ids(make_session_factory(engine))
    finally:
        engine.dispose()
    assert found == [org_id]
    assert isinstance(found[0], UUID)


def test_a_failing_backup_does_not_stop_the_sidecar(monkeypatch, capsys):
    """The one rule that outranks having a backup: an invoicing program that
    will not start because a backup failed is the worse outage, and a full
    disk would make it permanent."""
    from desktop import bootstrap

    def explode(*args, **kwargs):
        raise OSError("no space left on device")

    monkeypatch.setattr(bootstrap.backups, "write_backup", explode)

    assert bootstrap.safe_backup("sqlite:///whatever.db") is None
    assert "BILLGEN_BACKUP error=" in capsys.readouterr().err
