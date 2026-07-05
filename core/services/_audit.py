"""Audit-entry helper. Must be called inside the same UnitOfWork transaction as
the mutation it records, so log and change commit (or roll back) together."""

from typing import Any
from uuid import UUID

from ..models import AuditAction, AuditLogEntry
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from ..utils import json_safe


def record(
    uow: UnitOfWork,
    *,
    action: AuditAction,
    target_type: str,
    target_id: UUID | None = None,
    before: Any = None,
    after: Any = None,
    actor_user_id: UUID | None = None,
) -> AuditLogEntry:
    entry = AuditLogEntry(
        organization_id=current_organization_id(),
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=json_safe(before) if before is not None else None,
        after=json_safe(after) if after is not None else None,
    )
    return uow.audit_log.append(entry)
