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


class SupplyKind(str, Enum):
    """Goods or services — the fiscal distinction, not a catalogue label.

    It exists because the two are treated differently the moment a sale
    crosses a border: intra-EU B2B *services* are reverse-charged to the buyer
    (Art. 51 §2), while intra-EU B2B *goods* are an exempt intra-Community
    supply (Art. 39bis). Same customer, same country, different article on the
    invoice — and nothing in the data could tell them apart before this.

    Not to be confused with the commercial distinction between a packaged
    offer and labour by measure: a weekly transport package and a cleaning job
    are both SERVICES here. `Product.billing_type` and `Product.category` are
    what organise the catalogue.
    """

    GOODS = "goods"
    SERVICES = "services"


class VATRate(DomainModel):
    category: VATCategory = VATCategory.STANDARD
    rate: Decimal = Field(default=Decimal("21.0"), ge=Decimal("0"), le=Decimal("100"))
    legal_mention: str | None = None
