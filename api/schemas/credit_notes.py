from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from .invoices import VATOut


class CreditNoteIssueRequest(BaseModel):
    invoice_id: UUID
    reason: str = Field(min_length=1)
    issue_date: date | None = None


class CreditNoteLineOut(BaseModel):
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    product_id: UUID | None
    vat: VATOut


class CreditNoteResponse(BaseModel):
    id: UUID
    company_id: UUID
    client_id: UUID
    invoice_id: UUID
    reference: str
    sequence_global: int
    issue_date: date
    reason: str
    currency: str
    lines: list[CreditNoteLineOut]
    comments: str | None
    pdf_template: str
    subtotal_ht: Decimal
    total_vat: Decimal
    total_ttc: Decimal
