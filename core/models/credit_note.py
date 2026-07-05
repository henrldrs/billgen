from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from ._base import DomainModel, TenantModel
from .currency import Currency
from .tax import VATRate


class CreditNoteLine(DomainModel):
    line_number: int = Field(ge=1)
    description: str = Field(min_length=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_price: Decimal = Field(ge=Decimal("0"))
    product_id: UUID | None = None
    vat: VATRate = Field(default_factory=VATRate)


class CreditNote(TenantModel):
    company_id: UUID
    client_id: UUID
    invoice_id: UUID

    reference: str = Field(min_length=1, max_length=64)
    sequence_global: int = Field(ge=1)

    issue_date: date
    reason: str = Field(min_length=1)

    currency: Currency = Currency.EUR
    lines: list[CreditNoteLine] = Field(default_factory=list)
    comments: str | None = None
    pdf_template: str = "credit_note"

    subtotal_ht: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_vat: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_ttc: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
