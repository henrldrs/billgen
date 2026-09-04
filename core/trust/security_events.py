"""Which audit entries are *security* events, and which of them are recorded.

The audit log already exists, is append-only and is wired to a screen. A
security-events view is therefore not a new subsystem — it is a filter over the
log, which is the cheapest L4 surface in the whole roadmap.

The trap is the second half of this module. An action can belong on a security
screen and have no producer, and a screen that filters on it and finds nothing
renders an empty table — which in a security centre reads as "no incidents"
when it means "not watching". `unrecorded()` is what lets the endpoint say so
out loud instead.

Today that list is one entry long (`ERROR`). It was drafted as three, on the
strength of a grep for `AuditAction.LOGIN` that found no callers; sign-ins,
sign-outs, session revocations and password changes are in fact all recorded by
`api/security/auth_service.py`, which writes the row directly with a plain
string. Checking against a running server rather than against the grep is what
corrected it — and turned up the enum bug the two `.`-separated actions caused
(see `core.models.audit_log`).
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel

from ..models import AuditAction, AuditLogEntry


class SecurityEventKind(str, Enum):
    SIGN_IN = "sign_in"
    CREDENTIAL = "credential"
    DATA_EXPORT = "data_export"
    DATA_RESTORE = "data_restore"
    DELETION = "deletion"
    FAILURE = "failure"


class SecuritySeverity(str, Enum):
    """Deliberately not reused from alerts_service.Severity.

    An alert grades a *business* problem (an invoice is overdue). This grades
    exposure. Sharing an enum would eventually put an overdue invoice and a
    database restore on the same scale.
    """

    INFO = "info"
    NOTICE = "notice"
    WARNING = "warning"


class _Rule(BaseModel):
    kind: SecurityEventKind
    severity: SecuritySeverity
    label: str
    #  Does any code path write this action today? See the module docstring —
    #  a False here is why the screen can be empty and still be broken.
    recorded: bool


#  Ordered by exposure, highest first. A full backup leaving the system is the
#  single most valuable event in this product: it is every invoice, every client
#  address and every VAT number in one file.
_RULES: dict[AuditAction, _Rule] = {
    AuditAction.RESTORE: _Rule(
        kind=SecurityEventKind.DATA_RESTORE,
        severity=SecuritySeverity.WARNING,
        label="Organization restored from a backup",
        recorded=True,
    ),
    AuditAction.EXPORT_BACKUP: _Rule(
        kind=SecurityEventKind.DATA_EXPORT,
        severity=SecuritySeverity.NOTICE,
        label="Full organization backup exported",
        recorded=True,
    ),
    AuditAction.DELETE: _Rule(
        kind=SecurityEventKind.DELETION,
        severity=SecuritySeverity.NOTICE,
        label="Record deleted",
        recorded=True,
    ),
    AuditAction.PASSWORD_CHANGE: _Rule(
        kind=SecurityEventKind.CREDENTIAL,
        severity=SecuritySeverity.NOTICE,
        label="Password changed",
        recorded=True,
    ),
    AuditAction.SESSION_REVOKE: _Rule(
        kind=SecurityEventKind.SIGN_IN,
        severity=SecuritySeverity.NOTICE,
        #  A revocation is a notice rather than info because it is what somebody
        #  does *after* seeing a session they do not recognise — the row next to
        #  it is the interesting one.
        label="Session revoked",
        recorded=True,
    ),
    AuditAction.LOGIN: _Rule(
        kind=SecurityEventKind.SIGN_IN,
        severity=SecuritySeverity.INFO,
        label="Signed in",
        recorded=True,
    ),
    AuditAction.LOGOUT: _Rule(
        kind=SecurityEventKind.SIGN_IN,
        severity=SecuritySeverity.INFO,
        label="Signed out",
        recorded=True,
    ),
    AuditAction.ERROR: _Rule(
        kind=SecurityEventKind.FAILURE,
        severity=SecuritySeverity.WARNING,
        label="Failed operation",
        #  The one genuine hole left: nothing anywhere writes an `error` entry.
        #  A failed sign-in — the single most useful line in a security log — is
        #  not recorded, so repeated password guessing is invisible.
        recorded=False,
    ),
}

SECURITY_ACTIONS: frozenset[AuditAction] = frozenset(_RULES)


class SecurityEvent(BaseModel):
    """One audit entry, read as a security event.

    Wraps rather than replaces the entry: the screen still wants the actor and
    the timestamp, and re-deriving those would put two shapes of the same row
    into the API.
    """

    entry: AuditLogEntry
    kind: SecurityEventKind
    severity: SecuritySeverity
    label: str


def classify(entry: AuditLogEntry) -> SecurityEvent | None:
    """`None` for the ordinary business mutations — an invoice being issued is
    not a security event, and a log that says everything says nothing."""
    rule = _RULES.get(entry.action)
    if rule is None:
        return None
    return SecurityEvent(
        entry=entry,
        kind=rule.kind,
        severity=rule.severity,
        label=rule.label,
    )


def unrecorded() -> tuple[AuditAction, ...]:
    """The security actions no code path writes yet.

    The endpoint returns this beside the events so the screen can state its own
    blind spots. Today it is exactly one: `error`. Nothing records a *failed*
    sign-in, which is the line a security log exists for — a hundred wrong
    passwords in a minute leave no trace at all.
    """
    return tuple(action for action, rule in _RULES.items() if not rule.recorded)


def is_security_event(entry: AuditLogEntry) -> bool:
    return entry.action in SECURITY_ACTIONS
