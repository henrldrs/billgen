from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SearchHitResponse(BaseModel):
    kind: str
    id: UUID
    title: str
    subtitle: str | None = None
    status: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    company_id: UUID | None = None


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHitResponse]
    # Per-kind counts, so the palette can group without walking the list, and
    # `truncated` so it can say "more" instead of pretending this is all of it.
    counts: dict[str, int]
    truncated: bool
