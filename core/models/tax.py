from decimal import Decimal
from enum import Enum

from pydantic import Field

from ._base import DomainModel


class VATCategory(str, Enum):
    """EN 16931 VAT category codes used in Peppol UBL."""

    STANDARD = "S"
    ZERO = "Z"
    EXEMPT = "E"
    REVERSE_CHARGE = "AE"
    INTRA_EU = "K"
    EXPORT = "G"
    NOT_SUBJECT = "O"


class VATRate(DomainModel):
    category: VATCategory = VATCategory.STANDARD
    rate: Decimal = Field(default=Decimal("21.0"), ge=Decimal("0"), le=Decimal("100"))
    legal_mention: str | None = None
