from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request, Response

from core.backup import MIN_PASSPHRASE_LENGTH, UNRECOVERABLE_NOTICE, WeakPassphraseError
from core.documents import DocumentArchive
from core.repository import UnitOfWork
from core.services import BackupService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_document_archive, get_uow_factory
from ..schemas.backup import (
    EncryptedExportRequest,
    PassphraseNoticeResponse,
    RestoreReportResponse,
)

router = APIRouter(prefix="/backup", tags=["backup"])

#  A carried archive can be big — every invoice, every PDF. Still bounded:
#  an unbounded body on an endpoint that decrypts is a way to spend a server's
#  memory with one request.
MAX_ARCHIVE_BYTES = 512 * 1024 * 1024


@router.get("/export")
def export_backup(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.BACKUP_EXPORT)),
) -> dict[str, Any]:
    """The whole organization as a restorable JSON document (ADR-0003):
    companies, clients, products, invoices, credit notes, payments, the audit
    log, the document register, and the gapless sequence counters. Writes one
    export_backup audit entry; users/credentials are never included.

    Readable on purpose, and therefore **not** a file to carry: it is every
    client's name, address and VAT number in the clear. POST /backup/export/
    encrypted is the one that leaves the machine."""
    return BackupService(uow_factory).export(actor_user_id=user_id)


@router.get("/passphrase-notice", response_model=PassphraseNoticeResponse)
def passphrase_notice():
    """What a person must be told **before** choosing a passphrase, not after.

    One wording, generated from `core/backup/sealed.py`, so the settings panel,
    the first-run wizard and every error message say the same sentence and
    there is one place to correct it."""
    return PassphraseNoticeResponse(
        notice=UNRECOVERABLE_NOTICE, minimum_length=MIN_PASSPHRASE_LENGTH
    )


@router.post("/export/encrypted")
def export_backup_encrypted(
    body: EncryptedExportRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
    _perm: None = Depends(require_permission(Permission.BACKUP_EXPORT)),
):
    """One file that can leave the machine: the same JSON as GET /export plus
    the document PDFs, zipped and sealed with AES-256-GCM.

    **A POST, and the passphrase is in the body.** T-28 wrote this as
    `GET /backup/export?encrypt=true`; a passphrase in a query string ends up
    in browser history, proxy logs and referrers, and this one opens every
    client record the organization has. That is the deviation and this is the
    reason for it.

    `acknowledge_unrecoverable` must be true. The API refuses to produce an
    archive nobody can open unless the caller has said, in the request, that
    they know it — which is what makes "the UI says so before the first
    export" enforceable instead of hoped for."""
    if not body.acknowledge_unrecoverable:
        raise HTTPException(status_code=422, detail=UNRECOVERABLE_NOTICE)
    try:
        blob, packed = BackupService(uow_factory, archive).export_portable(
            body.passphrase, actor_user_id=user_id
        )
    except WeakPassphraseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return Response(
        content=blob,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": 'attachment; filename="billgen-backup.billgenbak"',
            #  Readable without opening the file, so a person can see what a
            #  download actually contains before trusting it with their year.
            "X-Backup-Documents": str(packed.documents),
            "X-Backup-Documents-Skipped": str(len(packed.skipped)),
        },
    )


@router.post("/restore", response_model=RestoreReportResponse)
def restore_backup(
    payload: dict[str, Any] = Body(..., description="A billgen-backup document"),
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
    _perm: None = Depends(require_permission(Permission.BACKUP_RESTORE)),
):
    """Disaster recovery: restore a backup into the current organization.
    Refuses (409) unless the organization has no companies yet — merging into
    live data would break the gapless-numbering guarantee.

    This one takes the plain JSON export. A sealed or zipped archive goes to
    POST /backup/restore/file, which carries the documents too."""
    report = BackupService(uow_factory, archive).restore(payload, actor_user_id=user_id)
    return RestoreReportResponse.model_validate(report.model_dump())


@router.post("/restore/file", response_model=RestoreReportResponse)
async def restore_backup_file(
    request: Request,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
    passphrase: str | None = Header(default=None, alias="X-Backup-Passphrase"),
    _perm: None = Depends(require_permission(Permission.BACKUP_RESTORE)),
):
    """Restore from a file: sealed, zipped, or the plain JSON export.

    The body is the archive itself, and the passphrase — when one is needed —
    travels in a header for the same reason it is not in a query string. Which
    kind of file this is comes from its own first eight bytes, so a passphrase
    is asked for only when the archive says it needs one.

    Documents carried by the archive are written back into the T-27 folder,
    driven by the restored register: a file the archive holds under a name the
    database does not know is not written."""
    blob = await request.body()
    if not blob:
        raise HTTPException(status_code=422, detail="No archive in the request body")
    if len(blob) > MAX_ARCHIVE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archive is larger than {MAX_ARCHIVE_BYTES // (1024 * 1024)} MB",
        )
    report = BackupService(uow_factory, archive).restore_portable(
        blob, passphrase=passphrase, actor_user_id=user_id
    )
    return RestoreReportResponse.model_validate(report.model_dump())
