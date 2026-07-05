from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreateRequest(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=Decimal("0"))
    paid_on: date
    method: str = "bank_transfer"
    reference: str | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: Decimal
    currency: str
    method: str
    paid_on: date
    reference: str | None
    notes: str | None


class PaymentRecordResponse(BaseModel):
    payment: PaymentResponse
    invoice_status: str
