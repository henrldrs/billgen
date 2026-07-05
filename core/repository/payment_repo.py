from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Payment


class PaymentRepository(ABC):
    @abstractmethod
    def add(self, payment: Payment) -> Payment: ...

    @abstractmethod
    def list_for_invoice(self, invoice_id: UUID) -> list[Payment]: ...
