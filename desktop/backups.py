r"""A dated backup of the whole database, written without anyone asking (T-23).

ADR-0003's export has existed as an endpoint and a panel since the beginning.
Nothing ever ran it unasked, which means the guarantee was "the customer
remembers" — and the customer is one person running an invoicing program on one
laptop under a seven-year retention duty.

**Where the ticket's premise did not survive contact.** T-23 assumed the
sidecar has a shutdown to hang this on. It does not, in the build that matters:
`src-tauri/src/main.rs` handles `ExitRequested` by calling `child.kill()`, which
on Windows is `TerminateProcess` — no signal, no handler, no `finally`, no
lifespan shutdown. A backup written only on close would have run on this
workstation, passed review, and never once run on Emilia's machine.

So it runs at **both ends, with different rules**:

- **On start**, before the port is bound, if today has no backup yet. This is
  the one that always runs, and what it captures is the state at the end of the
  last session — exactly what a backup-on-close would have written, one launch
  later.
- **On a clean shutdown**, overwriting today's. Reachable when the process is
  allowed to exit (Ctrl-C, a dev run, and any future graceful stop from the
  shell), and it upgrades today's file from "as of this morning" to "as of now".

Killed hard, nothing is lost that the next start does not pick up.

The archive is a zip of ADR-0003 JSON — one member per organization, plus a
manifest naming which member restores through `POST /backup/restore`. It does
**not** carry the T-27 document files, for two reasons that point the same way:
they are already in the same data folder a metre from this zip, and an
unencrypted archive of every client's name, address and VAT number is exactly
what must not travel on a USB stick. This backup stays on the machine. The one
that leaves is T-28's — `POST /backup/export/encrypted`, which carries the
documents and is sealed under a passphrase. A daily backup that stopped to ask
for one would be a daily backup that stopped happening.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime
from pathlib import Path
from uuid import UUID
from zipfile import ZIP_DEFLATED, ZipFile

from . import paths

BACKUP_DIR_NAME = "backups"
KEEP = 30
MANIFEST_NAME = "MANIFEST.json"
ARCHIVE_FORMAT = "billgen-daily-backup"

#  Only files this module wrote are ever deleted. A person who drops their own
#  copy of something in this folder must find it there next month.
_DATED = re.compile(r"^\d{4}-\d{2}-\d{2}\.zip$")


def backups_dir(data_dir: Path | None = None) -> Path:
    return (data_dir or paths.app_data_dir()) / BACKUP_DIR_NAME


def archive_path(day: date, data_dir: Path | None = None) -> Path:
    return backups_dir(data_dir) / f"{day.isoformat()}.zip"


def _organization_ids(session_factory) -> list[UUID]:  # noqa: ANN001
    """Every organization in this database, newest first.

    Deliberately *not* a method on `OrganizationRepository`: that port is shared
    with the hosted SaaS, and a cross-tenant enumeration sitting on it is a
    footgun waiting for the first caller who forgets which product they are in.
    Here it is correct — a desktop database holds exactly one organization, and
    a backup that silently skipped a second one would be the worse bug.
    """
    from sqlalchemy import select  # noqa: PLC0415 — deferred: desktop imports db lazily

    from db.models import OrganizationRow  # noqa: PLC0415

    with session_factory() as session:
        rows = session.execute(
            select(OrganizationRow.id).order_by(OrganizationRow.created_at.desc())
        ).scalars()
        return list(rows)


def write_backup(
    database_url: str,
    *,
    data_dir: Path | None = None,
    day: date | None = None,
    overwrite: bool = False,
    keep: int = KEEP,
) -> Path | None:
    """Write `<data dir>/backups/<date>.zip`. None when there was nothing to do.

    `overwrite=False` is the start-of-day rule: a file already there means this
    day is covered and the previous session's state is safe. `overwrite=True`
    is the clean-shutdown rule: replace today's with the newer state.
    """
    #  Deferred: keeps the cost of importing core and db off the boot path,
    #  where the license check runs before anything is allowed to load.
    from core.services import BackupService  # noqa: PLC0415
    from core.tenancy import organization_context  # noqa: PLC0415
    from db.engine import make_engine  # noqa: PLC0415
    from db.repositories import SqlAlchemyUnitOfWork  # noqa: PLC0415
    from db.session import make_session_factory  # noqa: PLC0415

    target = archive_path(day or date.today(), data_dir)
    if target.exists() and not overwrite:
        return None

    engine = make_engine(database_url)
    try:
        session_factory = make_session_factory(engine)
        organization_ids = _organization_ids(session_factory)
        if not organization_ids:
            #  A database migrated but never signed into. Writing an empty
            #  archive would start the retention clock on nothing and push a
            #  real backup out of the keep-30 window.
            return None

        def uow_factory() -> SqlAlchemyUnitOfWork:
            return SqlAlchemyUnitOfWork(session_factory)

        members: list[tuple[str, str]] = []
        manifest_entries: list[dict] = []
        for org_id in organization_ids:
            with organization_context(org_id):
                payload = BackupService(uow_factory).export()
            name = f"{org_id}.json"
            members.append((name, json.dumps(payload, indent=2, ensure_ascii=False)))
            manifest_entries.append(
                {
                    "organization_id": str(org_id),
                    "name": payload.get("organization", {}).get("name"),
                    "file": name,
                    "schema_version": payload.get("schema_version"),
                    "invoices": len(payload.get("invoices", [])),
                    "documents": len(payload.get("documents", [])),
                }
            )
    finally:
        engine.dispose()

    manifest = {
        "format": ARCHIVE_FORMAT,
        "version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        #  Said in the archive rather than only in a document nobody opens
        #  next to it: the person reading this may be restoring precisely
        #  because the machine that explained it is gone.
        "restore_with": "POST /backup/restore, one member file at a time",
        "documents_included": False,
        "organizations": manifest_entries,
    }

    target.parent.mkdir(parents=True, exist_ok=True)
    #  Staged and renamed: a crash mid-write must not leave a truncated zip
    #  where the rotation will count it as one of the thirty good ones.
    staging = target.with_name(f".{target.name}.part")
    with ZipFile(staging, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2, ensure_ascii=False))
        for name, body in members:
            archive.writestr(name, body)
    staging.replace(target)

    prune(target.parent, keep=keep)
    return target


def prune(directory: Path, keep: int = KEEP) -> list[Path]:
    """Delete all but the `keep` newest dated archives. Returns what went.

    Newest by *name*, not mtime: the name is an ISO date, which sorts
    correctly, and a file copied off a stick and back has an mtime that says
    nothing about the day it covers.
    """
    try:
        dated = sorted(
            (entry for entry in directory.iterdir() if _DATED.match(entry.name)),
            key=lambda entry: entry.name,
        )
    except OSError:
        return []

    removed: list[Path] = []
    for entry in dated[: max(len(dated) - keep, 0)]:
        try:
            entry.unlink()
        except OSError:
            continue
        removed.append(entry)
    return removed
