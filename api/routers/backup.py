from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends

from core.repository import UnitOfWork
from core.services import BackupService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.backup import RestoreReportResponse

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("/export")
def export_backup(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.BACKUP_EXPORT)),
) -> dict[str, Any]:
    """The whole organization as a restorable JSON document (ADR-0003):
    companies, clients, products, invoices, credit notes, payments, the audit
    log, and the gapless sequence counters. Writes one export_backup audit
    entry; users/credentials are never included."""
    return BackupService(uow_factory).export(actor_user_id=user_id)


@router.post("/restore", response_model=RestoreReportResponse)
def restore_backup(
    payload: dict[str, Any] = Body(..., description="A billgen-backup document"),
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.BACKUP_RESTORE)),
):
    """Disaster recovery: restore a backup into the current organization.
    Refuses (409) unless the organization has no companies yet — merging into
    live data would break the gapless-numbering guarantee."""
    report = BackupService(uow_factory).restore(payload, actor_user_id=user_id)
    return RestoreReportResponse.model_validate(report.model_dump())
