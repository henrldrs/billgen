from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import ActivityService
from core.trust.security_events import unrecorded

from ..deps import get_uow_factory
from ..schemas.activity import ActivityEntryResponse
from ..schemas.trust import SecurityEventResponse, SecurityEventsResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntryResponse])
def list_activity(
    limit: int = Query(default=50, ge=1, le=500),
    target_type: str | None = None,
    target_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """`target_id` scopes the log to a single record (a client, an invoice).
    Without it the log can only be read whole or by type, which is why the
    per-client history and activity screens had no source."""
    entries = ActivityService(uow_factory).list(
        limit=limit,
        target_type=target_type,
        target_id=target_id,
        actor_user_id=actor_user_id,
    )
    return [
        ActivityEntryResponse.model_validate(entry.model_dump()) for entry in entries
    ]


@router.get("/security", response_model=SecurityEventsResponse)
def list_security_events(
    limit: int = Query(default=50, ge=1, le=500),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """The security slice of the audit log, and what is not being watched.

    A filter over an existing table, not a new subsystem — which is why this is
    the cheapest screen in L4. The `not_recorded` half is the part that matters:
    sign-in, sign-out and failed operations have no producer anywhere in the
    stack, so an organization with a quiet log is an organization nobody is
    logging, and the screen has to be able to say that rather than render a
    reassuring empty table.
    """
    events = ActivityService(uow_factory).security_events(limit=limit)
    return SecurityEventsResponse(
        events=[
            SecurityEventResponse(
                entry=ActivityEntryResponse.model_validate(event.entry.model_dump()),
                kind=event.kind.value,
                severity=event.severity.value,
                label=event.label,
            )
            for event in events
        ],
        not_recorded=[action.value for action in unrecorded()],
    )
