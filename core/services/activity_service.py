from collections.abc import Callable
from uuid import UUID

from ..models import AuditLogEntry
from ..repository import UnitOfWork


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
    ) -> list[AuditLogEntry]:
        """`target_id` scopes the log to one record — the per-client and
        per-invoice history screens. It is orthogonal to `target_type`: an id is
        unique across types, so passing both is a narrowing, never a widening."""
        with self._uow_factory() as uow:
            return uow.audit_log.list(
                limit=limit, target_type=target_type, target_id=target_id
            )
