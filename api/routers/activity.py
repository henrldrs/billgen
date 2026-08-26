from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import ActivityService

from ..deps import get_uow_factory
from ..schemas.activity import ActivityEntryResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntryResponse])
def list_activity(
    limit: int = Query(default=50, ge=1, le=500),
    target_type: str | None = None,
    target_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """`target_id` scopes the log to a single record (a client, an invoice).
    Without it the log can only be read whole or by type, which is why the
    per-client history and activity screens had no source."""
    entries = ActivityService(uow_factory).list(
        limit=limit, target_type=target_type, target_id=target_id
    )
    return [
        ActivityEntryResponse.model_validate(entry.model_dump()) for entry in entries
    ]
