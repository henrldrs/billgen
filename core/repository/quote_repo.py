from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Quote, QuoteStatus


class QuoteRepository(ABC):
    """A quote is deletable at any point before it becomes an invoice.

    Nothing like the invoice rule applies here (ADR-0002 exists because a
    gapless number was consumed): a quote is a commercial offer, its series has
    no fiscal meaning, and a customer who says no leaves nothing to preserve.
    Once converted, the invoice is the record and the quote stays as its trail.
    """

    @abstractmethod
    def add(self, quote: Quote) -> Quote: ...

    @abstractmethod
    def get(self, quote_id: UUID) -> Quote | None: ...

    @abstractmethod
    def list(
        self,
        company_id: UUID | None = None,
        status: QuoteStatus | None = None,
        client_id: UUID | None = None,
    ) -> list[Quote]: ...

    @abstractmethod
    def search(self, term: str, limit: int = 10) -> list[Quote]:
        """Quotes whose reference contains `term`, case-insensitively."""
        ...

    @abstractmethod
    def update(self, quote: Quote) -> Quote: ...

    @abstractmethod
    def delete(self, quote_id: UUID) -> None:
        """Hard-delete a quote. Callers MUST ensure it has not been converted;
        the implementation refuses a converted quote as a last-line guard on the
        invoice's trail back to the offer it came from."""
        ...
