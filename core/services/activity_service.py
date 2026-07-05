from collections.abc import Callable

from ..models import AuditLogEntry
from ..repository import UnitOfWork


class ActivityService:
    """Read side of the audit log. Writes happen inside each mutating service's
    own transaction via core.services._audit."""

    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def list(self, limit: int = 50, target_type: str | None = None) -> list[AuditLogEntry]:
        with self._uow_factory() as uow:
            return uow.audit_log.list(limit=limit, target_type=target_type)
