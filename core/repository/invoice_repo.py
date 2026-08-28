from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Invoice, InvoiceStatus


class InvoiceRepository(ABC):
    """Hard-delete is allowed for DRAFT invoices only (ADR-0002): a draft has no
    gapless number, so deleting it cannot leave a gap. Issued invoices are never
    hard-deleted — correction goes through void + credit note (ADR-0001, Belgian
    gapless numbering)."""

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
        client_id: UUID | None = None,
    ) -> list[Invoice]: ...

    @abstractmethod
    def search(self, term: str, limit: int = 10) -> list[Invoice]:
        """Invoices whose reference contains `term`, case-insensitively.

        Reference only: it is what someone types when they are holding a paper
        invoice or reading a bank statement. Finding an invoice by *customer*
        goes through the client hit and its list, which is one keystroke more
        and does not need a join here.
        """
        ...

    @abstractmethod
    def update(self, invoice: Invoice) -> Invoice: ...

    @abstractmethod
    def delete(self, invoice_id: UUID) -> None:
        """Hard-delete an invoice. Callers MUST ensure it is still a DRAFT; the
        implementation refuses to delete a numbered (issued) invoice as a
        last-line guard on the gapless invariant."""
        ...
