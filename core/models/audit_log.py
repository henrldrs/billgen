from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field

from ._base import DomainModel


class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    VOID = "void"
    ISSUE = "issue"
    PAY = "pay"
    EXPORT_PDF = "export_pdf"
    EXPORT_PEPPOL = "export_peppol"
    EXPORT_BACKUP = "export_backup"
    RESTORE = "restore"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    IMPORT = "import"
    ERROR = "error"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class AuditLogEntry(DomainModel):
    id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    actor_user_id: UUID | None = None
    action: AuditAction
    target_type: str = Field(min_length=1, max_length=64)
    target_id: UUID | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    timestamp: datetime = Field(default_factory=_utcnow)
