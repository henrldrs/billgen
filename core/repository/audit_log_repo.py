from abc import ABC, abstractmethod

from ..models import AuditLogEntry


class AuditLogRepository(ABC):
    """Append-only. There is deliberately no update or delete."""

    @abstractmethod
    def append(self, entry: AuditLogEntry) -> AuditLogEntry: ...

    @abstractmethod
    def list(self, limit: int = 50, target_type: str | None = None) -> list[AuditLogEntry]: ...
