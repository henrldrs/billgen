from __future__ import annotations

from abc import ABC, abstractmethod
from types import TracebackType

from .audit_log_repo import AuditLogRepository
from .client_repo import ClientRepository
from .company_repo import CompanyRepository
from .credit_note_repo import CreditNoteRepository
from .invoice_repo import InvoiceRepository
from .organization_repo import OrganizationRepository
from .payment_repo import PaymentRepository
from .product_repo import ProductRepository
from .quote_repo import QuoteRepository
from .sequence_repo import SequenceRepository
from .user_repo import UserRepository


class UnitOfWork(ABC):
    """Transaction boundary. Services open one UoW per use-case, do all reads
    and writes through its repositories, then commit once."""

    organizations: OrganizationRepository
    users: UserRepository
    companies: CompanyRepository
    clients: ClientRepository
    products: ProductRepository
    invoices: InvoiceRepository
    quotes: QuoteRepository
    credit_notes: CreditNoteRepository
    payments: PaymentRepository
    sequences: SequenceRepository
    audit_log: AuditLogRepository

    def __enter__(self) -> UnitOfWork:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if exc_type is not None:
            self.rollback()

    @abstractmethod
    def commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...
