from abc import ABC, abstractmethod
from uuid import UUID

# Well-known sequence scopes. One gapless series per (organization, company, scope).
INVOICE_SERIES = "invoice"
CREDIT_NOTE_SERIES = "credit_note"


def monthly_bucket(client_id: UUID, year: int, month: int) -> str:
    """Scope for the per-(client, year, month) display-reference counter."""
    return f"bucket:{client_id}:{year:04d}-{month:02d}"


class SequenceRepository(ABC):
    @abstractmethod
    def next_value(self, company_id: UUID, scope: str) -> int:
        """Allocate the next value (1-based) for a scope, atomically within the
        surrounding transaction. Callers MUST persist whatever consumes the value
        in the same transaction, or the series would gap on rollback."""

    @abstractmethod
    def snapshot(self, company_id: UUID) -> dict[str, int]:
        """Current counter value per scope for one company — read-only, for the
        organization backup (ADR-0003)."""

    @abstractmethod
    def restore_value(self, company_id: UUID, scope: str, value: int) -> None:
        """Write a counter back during a backup restore (ADR-0003). Never lowers
        an existing counter — rewinding a live gapless series could mint
        duplicate invoice numbers."""
