from collections.abc import Callable

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
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    entries = ActivityService(uow_factory).list(limit=limit, target_type=target_type)
    return [
        ActivityEntryResponse.model_validate(entry.model_dump()) for entry in entries
    ]
