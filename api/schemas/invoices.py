from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class VATIn(BaseModel):
    category: str = "S"
    rate: Decimal = Field(default=Decimal("21.0"), ge=0, le=100)
    legal_mention: str | None = None


class DiscountIn(BaseModel):
    type: str = Field(pattern=r"^(percentage|fixed)$")
    value: Decimal = Field(ge=Decimal("0"))
    reason: str | None = None


class InvoiceLineIn(BaseModel):
    description: str = Field(min_length=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_price: Decimal = Field(ge=Decimal("0"))
    product_id: UUID | None = None
    vat: VATIn = Field(default_factory=VATIn)
    discount: DiscountIn | None = None


class InvoicePreviewRequest(BaseModel):
    lines: list[InvoiceLineIn] = Field(min_length=1)
    invoice_discount: DiscountIn | None = None
    currency: str = "EUR"


class InvoicePreviewResponse(BaseModel):
    subtotal_ht: Decimal
    total_discount: Decimal
    net_ht: Decimal
    total_vat: Decimal
    total_ttc: Decimal
    vat_breakdown: dict[str, Decimal]


class InvoiceCreateRequest(BaseModel):
    company_id: UUID
    client_id: UUID
    lines: list[InvoiceLineIn] = Field(min_length=1)
    issue_date: date | None = None
    due_date: date | None = None
    invoice_discount: DiscountIn | None = None
    comments: str | None = None
    payment_terms: str | None = None
    pdf_template: str | None = None
    currency: str | None = None


class VoidRequest(BaseModel):
    reason: str = Field(min_length=1)


class IssueRequest(BaseModel):
    """Issue a draft. Both dates are optional: the draft's own dates (or today +
    default term) are used when omitted."""

    issue_date: date | None = None
    due_date: date | None = None


class VATOut(BaseModel):
    category: str
    rate: Decimal
    legal_mention: str | None


class DiscountOut(BaseModel):
    type: str
    value: Decimal
    reason: str | None


class InvoiceLineOut(BaseModel):
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    product_id: UUID | None
    vat: VATOut
    discount: DiscountOut | None


class InvoiceResponse(BaseModel):
    id: UUID
    company_id: UUID
    client_id: UUID
    reference: str | None
    sequence_global: int | None
    issue_date: date
    due_date: date | None
    currency: str
    lines: list[InvoiceLineOut]
    invoice_discount: DiscountOut | None
    comments: str | None
    payment_terms: str | None
    pdf_template: str
    subtotal_ht: Decimal
    total_discount: Decimal
    total_vat: Decimal
    total_ttc: Decimal
    status: str
    voided_at: datetime | None
    voided_reason: str | None
    voided_by_credit_note_id: UUID | None
