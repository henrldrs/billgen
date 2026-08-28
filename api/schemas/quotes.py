"""Wire shapes for quotes.

Line and discount shapes are the invoice ones, imported rather than redeclared:
a quote line *is* an invoice line, and conversion has to be lossless. Two
identical schemas would drift the first time either grew a field.
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from .invoices import DiscountIn, DiscountOut, InvoiceLineIn, InvoiceLineOut


class QuoteCreateRequest(BaseModel):
    company_id: UUID
    client_id: UUID
    lines: list[InvoiceLineIn] = Field(min_length=1)
    issue_date: date | None = None
    valid_until: date | None = None
    quote_discount: DiscountIn | None = None
    comments: str | None = None
    terms: str | None = None
    pdf_template: str | None = None
    currency: str | None = None


class QuoteDecisionRequest(BaseModel):
    """Accepting or rejecting. The note is what the customer said, kept because
    "too expensive" and "wrong scope" are different lessons."""

    note: str | None = None


class QuoteConvertRequest(BaseModel):
    """Dates for the draft invoice. Both optional: today, and the company's
    default term, when omitted."""

    issue_date: date | None = None
    due_date: date | None = None


class QuoteResponse(BaseModel):
    id: UUID
    company_id: UUID
    client_id: UUID
    reference: str
    sequence_global: int
    issue_date: date
    valid_until: date | None
    currency: str
    lines: list[InvoiceLineOut]
    quote_discount: DiscountOut | None
    comments: str | None
    terms: str | None
    pdf_template: str
    subtotal_ht: Decimal
    total_discount: Decimal
    total_vat: Decimal
    total_ttc: Decimal
    status: str
    # The stored status refined with expiry, which is a function of today's date
    # rather than of a scheduler having run. `status` says what was written
    # down; `effective_status` says what it means now.
    effective_status: str
    sent_at: datetime | None
    decided_at: datetime | None
    decision_note: str | None
    converted_invoice_id: UUID | None


class QuoteConvertResponse(BaseModel):
    """What conversion produced: the closed quote, and a DRAFT invoice.

    A draft, not an invoice — the gapless number is still consumed by
    POST /invoices/{id}/issue and nowhere else.
    """

    quote: QuoteResponse
    invoice_id: UUID
    invoice_status: str
