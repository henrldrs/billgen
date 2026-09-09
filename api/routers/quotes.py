"""Quotes — a priced offer, numbered from its own series.

The rules live in `core.services.quote_service`; the two that shape this router:
a quote never touches the invoice sequence, and converting one produces a DRAFT
invoice rather than an issued document. `POST /invoices/{id}/issue` stays the
only place a gapless number is consumed.

No quota. `Meter.INVOICES` counts invoices, and metering offers against the
invoice allowance would mean a customer pays for work they did not win. Whether
quotes get an allowance of their own is a pricing decision, not a bug — see
docs/SOLO_RUN.md, § Open decisions parked for him.
"""

from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from core.models import Currency, Discount, InvoiceLine, Quote, QuoteStatus, VATRate
from core.repository import UnitOfWork
from core.services import QuoteService
from core.services.quote_service import effective_status

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.quotes import (
    QuoteConvertRequest,
    QuoteConvertResponse,
    QuoteCreateRequest,
    QuoteDecisionRequest,
    QuoteResponse,
)

router = APIRouter(prefix="/quotes", tags=["quotes"])


def _parse_currency(value: str | None) -> Currency | None:
    if value is None:
        return None
    try:
        return Currency(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown currency: {value}") from None


def _to_core_lines(lines_in) -> list[InvoiceLine]:
    return [
        InvoiceLine(
            line_number=index,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            product_id=line.product_id,
            vat=VATRate.model_validate(line.vat.model_dump()),
            discount=(
                Discount.model_validate(line.discount.model_dump())
                if line.discount
                else None
            ),
        )
        for index, line in enumerate(lines_in, start=1)
    ]


def _to_response(quote: Quote, today: date | None = None) -> QuoteResponse:
    return QuoteResponse.model_validate(
        {
            **quote.model_dump(),
            "effective_status": effective_status(quote, today or date.today()),
        }
    )


@router.post("", response_model=QuoteResponse, status_code=201)
def create_quote(
    body: QuoteCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    """Create a quote. It is numbered here, from the quote series."""
    quote = QuoteService(uow_factory).create(
        company_id=body.company_id,
        client_id=body.client_id,
        lines=_to_core_lines(body.lines),
        issue_date=body.issue_date,
        valid_until=body.valid_until,
        quote_discount=(
            Discount.model_validate(body.quote_discount.model_dump())
            if body.quote_discount
            else None
        ),
        comments=body.comments,
        terms=body.terms,
        pdf_template=body.pdf_template,
        currency=_parse_currency(body.currency),
        actor_user_id=user_id,
    )
    return _to_response(quote)


@router.get("", response_model=list[QuoteResponse])
def list_quotes(
    company_id: UUID | None = None,
    status: str | None = None,
    client_id: UUID | None = None,
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """`status` filters on the *stored* status. Expiry is derived, so filtering
    on it would mean querying a value no column holds — read `effective_status`
    off each row instead."""
    parsed = None
    if status is not None:
        try:
            parsed = QuoteStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Unknown quote status: {status}"
            ) from None
    quotes = QuoteService(uow_factory).list(
        company_id=company_id, status=parsed, client_id=client_id
    )
    as_of = today or date.today()
    return [_to_response(quote, as_of) for quote in quotes]


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: UUID,
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(QuoteService(uow_factory).get(quote_id), today)


@router.post("/{quote_id}/send", response_model=QuoteResponse)
def send_quote(
    quote_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    """Record that the offer went out. Nothing is emailed — that waits on B1.
    What this buys today is a date, which is what "you never replied to our
    quote of the 3rd" is made of."""
    return _to_response(QuoteService(uow_factory).mark_sent(quote_id, actor_user_id=user_id))


@router.post("/{quote_id}/accept", response_model=QuoteResponse)
def accept_quote(
    quote_id: UUID,
    body: QuoteDecisionRequest | None = None,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    """The customer said yes. Still no invoice — POST /quotes/{id}/convert."""
    body = body or QuoteDecisionRequest()
    quote = QuoteService(uow_factory).accept(quote_id, note=body.note, actor_user_id=user_id)
    return _to_response(quote)


@router.post("/{quote_id}/reject", response_model=QuoteResponse)
def reject_quote(
    quote_id: UUID,
    body: QuoteDecisionRequest | None = None,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    body = body or QuoteDecisionRequest()
    quote = QuoteService(uow_factory).reject(quote_id, note=body.note, actor_user_id=user_id)
    return _to_response(quote)


@router.post("/{quote_id}/expire", response_model=QuoteResponse)
def expire_quote(
    quote_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    """Write the derived expiry down — closing out a pipeline by hand, and the
    only way to expire an offer early."""
    return _to_response(QuoteService(uow_factory).expire(quote_id, actor_user_id=user_id))


@router.post("/{quote_id}/convert", response_model=QuoteConvertResponse, status_code=201)
def convert_quote(
    quote_id: UUID,
    body: QuoteConvertRequest | None = None,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_WRITE)),
):
    """Turn an accepted quote into a DRAFT invoice, once.

    Requires `invoice.write`, not `quote.write`: this creates an invoice, and
    the permission has to match what comes out rather than what went in.

    Unmetered, deliberately. The invoice allowance is consumed at draft
    creation, which this performs — but refusing to convert a signed offer
    because a monthly counter is full would block the one thing the customer
    has already agreed to pay for. The draft it produces is counted like any
    other the moment the next one is created.
    """
    body = body or QuoteConvertRequest()
    quote, invoice = QuoteService(uow_factory).convert(
        quote_id,
        issue_date=body.issue_date,
        due_date=body.due_date,
        actor_user_id=user_id,
    )
    return QuoteConvertResponse(
        quote=_to_response(quote),
        invoice_id=invoice.id,
        invoice_status=invoice.status.value,
    )


@router.delete("/{quote_id}", status_code=204)
def delete_quote(
    quote_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.QUOTE_WRITE)),
):
    """Delete a quote that never became an invoice. ADR-0002 does not apply
    here: it exists because an issued invoice consumed a gapless number, and a
    quote's series has no fiscal meaning."""
    QuoteService(uow_factory).delete(quote_id, actor_user_id=user_id)
