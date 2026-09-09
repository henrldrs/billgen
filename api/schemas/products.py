from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    unit_price: Decimal = Field(ge=Decimal("0"))
    currency: str = "EUR"
    billing_type: str = "fixed"
    supply_kind: str = "services"
    status: str = "active"
    pipeline_stage: str | None = None
    default_vat_rate: Decimal = Field(default=Decimal("21.0"), ge=0, le=100)
    tags: list[str] = Field(default_factory=list)


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    unit_price: Decimal | None = Field(default=None, ge=Decimal("0"))
    currency: str | None = None
    billing_type: str | None = None
    supply_kind: str | None = None
    status: str | None = None
    pipeline_stage: str | None = None
    default_vat_rate: Decimal | None = Field(default=None, ge=0, le=100)
    tags: list[str] | None = None


class ProductResponse(BaseModel):
    id: UUID
    organization_id: UUID
    company_id: UUID
    name: str
    description: str | None
    category: str | None
    unit_price: Decimal
    currency: str
    billing_type: str
    supply_kind: str
    status: str
    pipeline_stage: str | None
    default_vat_rate: Decimal
    tags: list[str]
