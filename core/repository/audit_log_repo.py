from abc import ABC, abstractmethod
from collections.abc import Collection
from uuid import UUID

from ..models import AuditAction, AuditLogEntry


class AuditLogRepository(ABC):
    """Append-only. There is deliberately no update or delete."""

    @abstractmethod
    def append(self, entry: AuditLogEntry) -> AuditLogEntry: ...

    @abstractmethod
    def list(
        self,
        limit: int = 50,
        target_type: str | None = None,
        target_id: UUID | None = None,
        actor_user_id: UUID | None = None,
        actions: Collection[AuditAction] | None = None,
    ) -> list[AuditLogEntry]:
        """`actor_user_id` answers "what did this person do", which is the
        Settings › Activity view. Filtered in SQL rather than in Python because
        an audit log is the one table that grows without bound.

        `actions` is the same argument for the security-events view: six of the
        fourteen actions belong on it (`core.trust.security_events`), and
        fetching a page of the log to discard most of it would silently return
        an emptier screen the busier the organization is."""
        ...
