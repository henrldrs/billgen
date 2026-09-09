"""One search box over four record types — what the command palette was missing.

The palette shipped able to navigate to pages and nothing else. What people
actually reach for it with is an invoice number off a bank statement or half a
customer's name, and until now the answer was "not found".

Ungated on purpose, for now. `search` is a graded feature in the commercial
matrix (`basic` / `full` / `advanced`) and, like every graded value, it is read
by the frontend to pick a variant and enforced by no endpoint. Adding a server
check here is a product decision, not a bug fix — see docs/SOLO_RUN.md,
§ Open decisions parked for him, where it is still open.
"""

from collections.abc import Callable

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import SearchService

from ..deps import get_uow_factory
from ..schemas.search import SearchHitResponse, SearchResponse

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(description="What to look for — a reference, a name, a VAT number"),
    limit: int = Query(default=5, ge=1, le=25, description="Max hits per record type"),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
) -> SearchResponse:
    """Find invoices, credit notes, clients and products matching `q`.

    A term shorter than two characters returns nothing rather than everything:
    the palette fires on every keystroke, and one character matches most of any
    table. That is an empty result, not a 422 — the user is still typing, and an
    error for an unfinished word is noise.
    """
    results = SearchService(uow_factory).search(q, limit_per_kind=limit)
    return SearchResponse(
        query=results.query,
        hits=[
            SearchHitResponse(
                kind=hit.kind.value,
                id=hit.id,
                title=hit.title,
                subtitle=hit.subtitle,
                status=hit.status,
                amount=hit.amount,
                currency=hit.currency,
                company_id=hit.company_id,
            )
            for hit in results.hits
        ],
        counts=results.counts,
        truncated=results.truncated,
    )
