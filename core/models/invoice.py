from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import DomainModel, TenantModel
from .currency import Currency
from .discount import Discount
from .tax import VATRate


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    VOIDED = "voided"


class InvoiceLine(DomainModel):
    line_number: int = Field(ge=1)
    description: str = Field(min_length=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_price: Decimal = Field(ge=Decimal("0"))
    product_id: UUID | None = None
    vat: VATRate = Field(default_factory=VATRate)
    discount: Discount | None = None


class Invoice(TenantModel):
    company_id: UUID
    client_id: UUID

    # Assigned only at issue(): a DRAFT has no gapless number yet. Once issued,
    # both are set and frozen (ADR-0002). Kept nullable so drafts carry no number.
    reference: str | None = Field(default=None, max_length=64)
    sequence_global: int | None = Field(default=None, ge=1)

    issue_date: date
    due_date: date | None = None

    currency: Currency = Currency.EUR
    lines: list[InvoiceLine] = Field(default_factory=list)
    invoice_discount: Discount | None = None
    comments: str | None = None
    payment_terms: str | None = None

    pdf_template: str = "fr_standard"

    subtotal_ht: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_discount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_vat: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_ttc: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))

    status: InvoiceStatus = InvoiceStatus.DRAFT
    voided_at: datetime | None = None
    voided_reason: str | None = None
    voided_by_credit_note_id: UUID | None = None
