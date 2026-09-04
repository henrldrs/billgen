from collections.abc import Callable, Collection
from uuid import UUID

from ..models import AuditAction, AuditLogEntry
from ..repository import UnitOfWork
from ..trust.security_events import SECURITY_ACTIONS, SecurityEvent, classify


class ActivityService:
    """Read side of the audit log. Writes happen inside each mutating service's
    own transaction via core.services._audit."""

    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def list(
        self,
        limit: int = 50,
        target_type: str | None = None,
        target_id: UUID | None = None,
        actor_user_id: UUID | None = None,
        actions: Collection[AuditAction] | None = None,
    ) -> list[AuditLogEntry]:
        """`target_id` scopes the log to one record — the per-client and
        per-invoice history screens. It is orthogonal to `target_type`: an id is
        unique across types, so passing both is a narrowing, never a widening.

        `actions` narrows to a set of action types, which is how the security
        screen reads its slice (`core.trust.security_events.SECURITY_ACTIONS`)
        without a second table."""
        with self._uow_factory() as uow:
            return uow.audit_log.list(
                limit=limit,
                target_type=target_type,
                target_id=target_id,
                actor_user_id=actor_user_id,
                actions=actions,
            )

    def security_events(self, limit: int = 50) -> list[SecurityEvent]:
        """The security slice of the log, already classified.

        Kept here rather than in the router because "which actions count" is a
        domain question, and the desktop shell will ask it too.

        What this cannot do is invent the entries nothing writes: sign-in,
        sign-out and failures have no producer yet, so the caller is expected
        to pair this with `core.trust.security_events.unrecorded()` and say so
        on the screen. An empty security log that looks calm is the failure
        mode worth engineering against.
        """
        entries = self.list(limit=limit, actions=SECURITY_ACTIONS)
        return [event for entry in entries if (event := classify(entry)) is not None]
