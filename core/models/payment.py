from datetime import date
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import TenantModel
from .currency import Currency


class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    CASH = "cash"
    CHECK = "check"
    OTHER = "other"


class Payment(TenantModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=Decimal("0"))
    currency: Currency = Currency.EUR
    method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    paid_on: date
    reference: str | None = None
    notes: str | None = None
