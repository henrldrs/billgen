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
    #  A rendered document was written to the archive folder (T-27).
    ARCHIVE_DOCUMENT = "archive_document"
    #  T-29: a versioned legal text accepted, and the first run finished.
    ACCEPT_LEGAL = "accept_legal"
    ONBOARDING_COMPLETE = "onboarding_complete"
    #  T-35: a data subject's export, an erasure, a consent decision recorded.
    PRIVACY_EXPORT = "privacy_export"
    PRIVACY_ERASE = "privacy_erase"
    CONSENT = "consent"
    RESTORE = "restore"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    IMPORT = "import"
    ERROR = "error"
    #  Written by api/security/auth_service.py, which builds AuditLogRow directly
    #  and passes the action as a plain string. The column is a String, so the
    #  writes always succeeded — and the *reads* did not: `to_domain` validates
    #  this enum, so one session revocation made GET /activity return 422 for
    #  that organization forever. Found 2026-09-04 by revoking a session against
    #  a running server. The enum is the contract; a writer emitting a value it
    #  does not list is the bug, and these two were the values.
    SESSION_REVOKE = "session.revoke"
    PASSWORD_CHANGE = "password.change"


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
