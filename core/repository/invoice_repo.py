from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Invoice, InvoiceStatus


class InvoiceRepository(ABC):
    """Note: hard-delete is deliberately absent. Correction goes through
    void + credit note (ADR-0001, Belgian gapless numbering)."""

    @abstractmethod
    def add(self, invoice: Invoice) -> Invoice: ...

    @abstractmethod
    def get(self, invoice_id: UUID) -> Invoice | None: ...

    @abstractmethod
    def get_by_reference(self, company_id: UUID, reference: str) -> Invoice | None: ...

    @abstractmethod
    def list(
        self,
        company_id: UUID | None = None,
        status: InvoiceStatus | None = None,
    ) -> list[Invoice]: ...

    @abstractmethod
    def update(self, invoice: Invoice) -> Invoice: ...
