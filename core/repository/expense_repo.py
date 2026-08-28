from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from ..tva.models import Expense
from ..tva.states import ExpenseState


class ExpenseRepository(ABC):
    """An expense is deletable, unlike an invoice.

    Nothing fiscal is consumed by importing a document: no gapless number, no
    sequence, no obligation. A mis-scanned receipt is a mistake to remove, not a
    record to preserve — the opposite of ADR-0002's rule for issued invoices.

    `find_duplicate` is the one method the scaffold could not implement, and the
    reason this port exists at all: duplicate detection needs a lookup, and
    `core/tva/validation.py` is pure by design.
    """

    @abstractmethod
    def add(self, expense: Expense) -> Expense: ...

    @abstractmethod
    def get(self, expense_id: UUID) -> Expense | None: ...

    @abstractmethod
    def list(
        self,
        company_id: UUID | None = None,
        state: ExpenseState | None = None,
        needs_attention: bool | None = None,
    ) -> list[Expense]: ...

    @abstractmethod
    def update(self, expense: Expense) -> Expense: ...

    @abstractmethod
    def delete(self, expense_id: UUID) -> None: ...

    @abstractmethod
    def find_duplicate(
        self,
        company_id: UUID,
        supplier_vat_number: str | None,
        supplier_invoice_number: str | None,
        exclude_id: UUID | None = None,
    ) -> Expense | None:
        """The same supplier document already imported, if any.

        Returns None when either identifier is missing rather than guessing from
        amount and date. Two identical lunches on the same day are not a
        duplicate, and telling a user their real second receipt is a duplicate
        is worse than missing one.
        """
        ...

    @abstractmethod
    def in_period(
        self, company_id: UUID, start: date, end: date
    ) -> list[Expense]:
        """Expenses whose document date falls in [start, end].

        Dated by the *document*, not by when it was imported: a January invoice
        scanned in March belongs to January's return.
        """
        ...
