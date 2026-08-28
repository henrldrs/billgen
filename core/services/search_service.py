"""Cross-record lookup for the command palette.

The palette could navigate to pages and nothing else, which is not what people
reach for it to do: they type an invoice number off a bank statement, or half a
customer's name. This is that lookup — one term, five record types, ranked.

Deliberately *not* full-text search. There is no tsvector, no index beyond what
the columns already carry, and no relevance model worth the name: a `LIKE` over
five tables answers "find the thing I am half-remembering" for an organization
holding a few thousand records, which is every tier the matrix sells. When a
customer has enough data for that to hurt, the fix is a real index, and the
shape of this service does not change.
"""

from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from uuid import UUID

from ..repository import UnitOfWork

# Below this, a search is not a search: two characters match a large fraction of
# any table, and the palette fires a request on every keystroke.
MIN_TERM_LENGTH = 2


class HitKind(str, Enum):
    INVOICE = "invoice"
    QUOTE = "quote"
    CREDIT_NOTE = "credit_note"
    CLIENT = "client"
    PRODUCT = "product"


@dataclass(frozen=True)
class SearchHit:
    """One result, in the shape a list row needs and no more.

    No URL: routing is the frontend's, and the server does not know its paths.
    `kind` plus `id` is enough to build one, and stays right when they change.
    """

    kind: HitKind
    id: UUID
    title: str
    subtitle: str | None = None
    status: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    company_id: UUID | None = None


@dataclass(frozen=True)
class SearchResults:
    query: str
    hits: list[SearchHit]
    counts: dict[str, int]
    truncated: bool


class SearchService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def search(self, term: str, limit_per_kind: int = 5) -> SearchResults:
        """Look `term` up across invoices, quotes, credit notes, clients and products.

        Ordering is by kind, not by score. An exact-ish reference match is the
        thing people are usually after, so documents come before the records
        they refer to; within a kind the repository's own order applies (newest
        document, alphabetical name).
        """
        term = term.strip()
        if len(term) < MIN_TERM_LENGTH:
            return SearchResults(query=term, hits=[], counts={}, truncated=False)

        with self._uow_factory() as uow:
            invoices = uow.invoices.search(term, limit=limit_per_kind)
            quotes = uow.quotes.search(term, limit=limit_per_kind)
            credit_notes = uow.credit_notes.search(term, limit=limit_per_kind)
            clients = uow.clients.search(term, limit=limit_per_kind)
            products = uow.products.search(term, limit=limit_per_kind)

        hits: list[SearchHit] = []
        hits.extend(
            SearchHit(
                kind=HitKind.INVOICE,
                id=invoice.id,
                title=invoice.reference or "",
                subtitle=str(invoice.issue_date),
                status=invoice.status.value,
                amount=invoice.total_ttc,
                currency=invoice.currency.value,
                company_id=invoice.company_id,
            )
            for invoice in invoices
        )
        hits.extend(
            SearchHit(
                kind=HitKind.QUOTE,
                id=quote.id,
                title=quote.reference,
                subtitle=str(quote.issue_date),
                status=quote.status.value,
                amount=quote.total_ttc,
                currency=quote.currency.value,
                company_id=quote.company_id,
            )
            for quote in quotes
        )
        hits.extend(
            SearchHit(
                kind=HitKind.CREDIT_NOTE,
                id=note.id,
                title=note.reference,
                subtitle=str(note.issue_date),
                amount=note.total_ttc,
                currency=note.currency.value,
                company_id=note.company_id,
            )
            for note in credit_notes
        )
        hits.extend(
            SearchHit(
                kind=HitKind.CLIENT,
                id=record.id,
                title=record.name,
                # Whichever identifier they searched by is the one worth showing
                # back: an email typed into the box should be visible in the row.
                subtitle=record.vat_number or record.email or record.city,
                company_id=record.company_id,
            )
            for record in clients
        )
        hits.extend(
            SearchHit(
                kind=HitKind.PRODUCT,
                id=product.id,
                title=product.name,
                subtitle=product.category,
                status=product.status.value,
                amount=product.unit_price,
                currency=product.currency.value,
                company_id=product.company_id,
            )
            for product in products
        )

        counts = {
            HitKind.INVOICE.value: len(invoices),
            HitKind.QUOTE.value: len(quotes),
            HitKind.CREDIT_NOTE.value: len(credit_notes),
            HitKind.CLIENT.value: len(clients),
            HitKind.PRODUCT.value: len(products),
        }
        # Any kind at its cap means "there may be more of these" — the palette
        # says so rather than implying it has shown everything.
        truncated = any(count >= limit_per_kind for count in counts.values())
        return SearchResults(query=term, hits=hits, counts=counts, truncated=truncated)
