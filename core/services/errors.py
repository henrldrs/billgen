from dataclasses import dataclass


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
