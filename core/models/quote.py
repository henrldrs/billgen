from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import TenantModel
from .currency import Currency
from .discount import Discount
from .invoice import InvoiceLine


class QuoteStatus(str, Enum):
    """A quote's life. `CONVERTED` is terminal and means an invoice exists.

    Note what is *not* here: no VOIDED. A quote is a commercial offer, not a
    fiscal document — nothing was declared, so nothing needs correcting. It is
    rejected, or it expires, and either way it can be deleted.
    """

    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"


class Quote(TenantModel):
    """A priced offer, numbered from its own series.

    Its number must never touch the invoice sequence. Belgian gapless numbering
    is a property of the invoice series specifically (ADR-0001), and a quote
    that consumed an invoice number would leave a hole in it the day the
    customer said no — which is most days.

    Lines are `InvoiceLine`, not a parallel class. They are the same value
    object down to the VAT category and the per-line discount, and conversion
    has to be lossless: a `QuoteLine` would exist only to be copied field by
    field into an `InvoiceLine`, and to drift from it later.
    """

    company_id: UUID
    client_id: UUID

    # Unlike an invoice, a quote is numbered at creation. There is no gapless
    # obligation on this series, so there is nothing to protect by waiting, and
    # a reference is exactly what the customer needs to quote back at you.
    reference: str = Field(min_length=1, max_length=64)
    sequence_global: int = Field(ge=1)

    issue_date: date
    # The offer's own deadline. Past it the price is not binding, which is the
    # whole point of writing one down.
    valid_until: date | None = None

    currency: Currency = Currency.EUR
    lines: list[InvoiceLine] = Field(default_factory=list)
    quote_discount: Discount | None = None
    comments: str | None = None
    terms: str | None = None

    pdf_template: str = "fr_standard"

    subtotal_ht: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_discount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_vat: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_ttc: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))

    status: QuoteStatus = QuoteStatus.DRAFT
    sent_at: datetime | None = None
    decided_at: datetime | None = None
    decision_note: str | None = None
    converted_invoice_id: UUID | None = None
