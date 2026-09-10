"""Which role may perform which action — the authorization matrix, as data.

The sibling of `api/entitlements/matrix.py`, and deliberately shaped like it:
endpoints declare a **permission**, never a role name. `invoice.void` is a
product action; `admin` is an org-structure decision. Keeping role names out of
the routers is what stops `if role == "owner"` from spreading.

**403, not 402.** A refusal here means *this person* may not do this, whatever
the subscription says. A refusal in `entitlements` means the plan does not
include it. The two must never blur — only the second opens an upgrade modal.

Only *write* actions are listed. Every authenticated member of an organization
may read its records, which is exactly what `viewer` is for: a role holding no
permissions at all is read-only by construction, with nothing to keep in sync.

The tiers where more than one seat exists are the tiers where this matters
(`Meter.SEATS` is 1 on Free and Starter), but enforcement is unconditional:
a single-seat org is an owner, and an owner holds everything.
"""

from __future__ import annotations

from enum import Enum

from core.models import Role


class Permission(str, Enum):
    """A write action. The value is the wire name used in a 403 body."""

    INVOICE_WRITE = "invoice.write"
    INVOICE_ISSUE = "invoice.issue"
    INVOICE_VOID = "invoice.void"
    QUOTE_WRITE = "quote.write"
    CLIENT_WRITE = "client.write"
    PRODUCT_WRITE = "product.write"
    COMPANY_WRITE = "company.write"
    CREDIT_NOTE_WRITE = "credit_note.write"
    PAYMENT_WRITE = "payment.write"
    EXPENSE_WRITE = "expense.write"
    TVA_REVIEW = "tva.review"
    TEMPLATE_WRITE = "template.write"
    IMPORT_RUN = "import.run"
    BACKUP_EXPORT = "backup.export"
    DOCUMENT_REBUILD = "document.rebuild"
    BACKUP_RESTORE = "backup.restore"


# Day-to-day billing work: compose an invoice, issue it, take the money,
# correct it with a credit note. Everything a person hired to do the invoicing
# needs, and nothing that rewrites the organization underneath them.
_MEMBER: frozenset[Permission] = frozenset(
    {
        Permission.INVOICE_WRITE,
        Permission.INVOICE_ISSUE,
        Permission.QUOTE_WRITE,
        Permission.CLIENT_WRITE,
        Permission.PRODUCT_WRITE,
        Permission.CREDIT_NOTE_WRITE,
        Permission.PAYMENT_WRITE,
        # Recording a supplier document and reviewing its TVA is the
        # same job as issuing an invoice: it is the bookkeeping the
        # member was hired to do, and it consumes nothing fiscal.
        Permission.EXPENSE_WRITE,
        Permission.TVA_REVIEW,
    }
)

# Adds the acts that reshape the org's own record rather than its trade:
# voiding an issued document, editing the legal entity, bulk-importing a
# history, taking a full copy of the data out.
_ADMIN: frozenset[Permission] = _MEMBER | {
    Permission.INVOICE_VOID,
    Permission.COMPANY_WRITE,
    # A template changes how every future document looks to every
    # customer. That is the organization's own record, not its trade.
    Permission.TEMPLATE_WRITE,
    Permission.IMPORT_RUN,
    Permission.BACKUP_EXPORT,
    #  Re-renders every issued invoice that has no file. It touches no fiscal
    #  data — the rows are already there — but it is a bulk act over the whole
    #  organization's history, which is the line _ADMIN draws.
    Permission.DOCUMENT_REBUILD,
}

ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    # Restore overwrites the tenant's entire dataset. It is the one action with
    # no undo, so it stays with the person who owns the account.
    Role.OWNER: frozenset(Permission),
    Role.ADMIN: _ADMIN,
    Role.MEMBER: _MEMBER,
    Role.VIEWER: frozenset(),
}


def permissions_for(role: str) -> frozenset[Permission]:
    """What `role` may do. An unrecognised role gets nothing.

    The role arrives as a string claim in a JWT, so this has to survive a value
    that is not in the enum — a token minted before a rename, or tampering.
    Failing closed is the only safe reading of "I do not know what this is".
    """
    try:
        return ROLE_PERMISSIONS[Role(role)]
    except ValueError:
        return frozenset()


def allows(role: str, permission: Permission) -> bool:
    return permission in permissions_for(role)


def roles_with(permission: Permission) -> list[Role]:
    """Every role that holds `permission` — what a 403 body names, so the UI can
    say "ask an admin" instead of "forbidden"."""
    return [role for role, granted in ROLE_PERMISSIONS.items() if permission in granted]
