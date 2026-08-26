from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from ..models import Payment


class PaymentRepository(ABC):
    @abstractmethod
    def add(self, payment: Payment) -> Payment: ...

    @abstractmethod
    def list_for_invoice(self, invoice_id: UUID) -> list[Payment]: ...

    @abstractmethod
    def list(
        self,
        company_id: UUID | None = None,
        client_id: UUID | None = None,
        invoice_id: UUID | None = None,
        paid_from: date | None = None,
        paid_to: date | None = None,
    ) -> list[Payment]:
        """Payments across invoices, newest first.

        `Payment` carries only `invoice_id` — company and client live on the
        invoice — so filtering by either is a join, not a column read. Doing it
        here rather than in the caller is what makes a payments *report*
        possible at all: `list_for_invoice` alone forces the client to fetch
        every invoice first.
        """
        ...
