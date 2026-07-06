from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends

from core.imports import ImportReport
from core.repository import UnitOfWork
from core.services import ImportService

from ..deps import current_user_id, get_uow_factory

router = APIRouter(prefix="/imports", tags=["imports"])

_BACKUP_BODY = Body(
    ...,
    description=(
        "A FinanceFlow BillGen backup: the whole `{app, keys}` object, or just "
        "the `billgen-*` keys map. Values may be JSON strings or already parsed."
    ),
)


@router.post("/legacy/preview", response_model=ImportReport)
def preview_legacy_import(
    payload: dict[str, Any] = _BACKUP_BODY,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Dry run: report what an import would create/skip, writing nothing."""
    return ImportService(uow_factory).preview(payload)


@router.post("/legacy/commit", response_model=ImportReport)
def commit_legacy_import(
    payload: dict[str, Any] = _BACKUP_BODY,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Import companies, clients, and products into the current organization.
    Idempotent: rows that already exist (by name, within scope) are skipped."""
    return ImportService(uow_factory).commit(payload, actor_user_id=user_id)
