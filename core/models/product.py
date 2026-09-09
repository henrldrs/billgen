from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import TenantModel
from .currency import Currency
from .tax import SupplyKind


class BillingType(str, Enum):
    HOURLY = "hourly"
    FIXED = "fixed"
    DAILY = "daily"
    UNIT = "unit"
    RECURRING = "recurring"


class ProductStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DRAFT = "draft"


class Product(TenantModel):
    company_id: UUID

    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)

    unit_price: Decimal = Field(ge=Decimal("0"))
    currency: Currency = Currency.EUR

    billing_type: BillingType = BillingType.FIXED
    # Fiscal, not commercial. Defaults to SERVICES because that is what a
    # Belgian SMB sells; getting it wrong on a domestic sale changes nothing,
    # and on a cross-border one it changes which article the invoice cites.
    supply_kind: SupplyKind = SupplyKind.SERVICES
    status: ProductStatus = ProductStatus.ACTIVE
    pipeline_stage: str | None = None

    default_vat_rate: Decimal = Field(
        default=Decimal("21.0"), ge=Decimal("0"), le=Decimal("100")
    )
    tags: list[str] = Field(default_factory=list)
