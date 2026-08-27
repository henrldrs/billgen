from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends

from core.imports import ImportReport
from core.repository import UnitOfWork
from core.services import ImportService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.imports import ImportReportResponse

router = APIRouter(prefix="/imports", tags=["imports"])


def _to_response(report: ImportReport) -> ImportReportResponse:
    return ImportReportResponse.model_validate(report.model_dump())

_BACKUP_BODY = Body(
    ...,
    description=(
        "A FinanceFlow BillGen backup: the whole `{app, keys}` object, or just "
        "the `billgen-*` keys map. Values may be JSON strings or already parsed."
    ),
)


@router.post("/legacy/preview", response_model=ImportReportResponse)
def preview_legacy_import(
    payload: dict[str, Any] = _BACKUP_BODY,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.IMPORT_RUN)),
):
    """Dry run: report what an import would create/skip, writing nothing."""
    return _to_response(ImportService(uow_factory).preview(payload))


@router.post("/legacy/commit", response_model=ImportReportResponse)
def commit_legacy_import(
    payload: dict[str, Any] = _BACKUP_BODY,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.IMPORT_RUN)),
):
    """Import companies, clients, and products into the current organization.
    Idempotent: rows that already exist (by name, within scope) are skipped."""
    return _to_response(ImportService(uow_factory).commit(payload, actor_user_id=user_id))
