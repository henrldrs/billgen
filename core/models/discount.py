from decimal import Decimal
from enum import Enum

from pydantic import Field

from ._base import DomainModel


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Discount(DomainModel):
    type: DiscountType = DiscountType.PERCENTAGE
    value: Decimal = Field(ge=Decimal("0"))
    reason: str | None = None
