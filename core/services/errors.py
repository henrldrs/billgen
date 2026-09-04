from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Import-time only: invoice_compliance imports nothing from here, so this is
    # not a cycle — it is kept behind the guard so the runtime import graph stays
    # one-directional and obviously so.
    from .invoice_compliance import ComplianceFinding


class NotFoundError(RuntimeError):
    """Entity does not exist within the current organization."""


class BusinessRuleError(RuntimeError):
    """The operation violates a domain rule (e.g. voiding twice, overpaying)."""


@dataclass(frozen=True)
class FieldError:
    """A single field-level validation problem. ``message_key`` is a stable i18n
    key the frontend maps to a localized message."""

    field: str
    message_key: str


class PeppolValidationError(BusinessRuleError):
    """The invoice's parties fail the pre-export Peppol gate (missing/invalid VAT,
    IBAN, BIC, country, address, name, or a B2C customer). Carries the per-field
    errors so the API can return a structured 422."""

    def __init__(self, errors: list[FieldError]) -> None:
        self.errors: list[FieldError] = list(errors)
        summary = ", ".join(f"{e.field}:{e.message_key}" for e in self.errors)
        super().__init__(f"Peppol validation failed ({summary})")


class InvoiceComplianceError(BusinessRuleError):
    """The draft is missing a mandatory legal mention, or contradicts itself, and
    must not be frozen into an issued VAT invoice.

    Distinct from ``PeppolValidationError`` on purpose, even though the two
    overlap on the party fields: Peppol is a *transport* gate that a PDF-only
    customer never meets, this is a *document* gate that every invoice meets.
    Carries the blocking findings so the API can return a structured 422 the
    composer can render field by field; advisory findings are deliberately not
    carried, because nothing here was refused on their account."""

    def __init__(self, findings: "list[ComplianceFinding]") -> None:
        self.findings: list[ComplianceFinding] = list(findings)
        summary = ", ".join(f"{f.field}:{f.message_key}" for f in self.findings)
        super().__init__(f"Invoice is not legally complete ({summary})")
