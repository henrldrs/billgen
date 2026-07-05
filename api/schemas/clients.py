from uuid import UUID

from pydantic import BaseModel, Field


class ClientCreateRequest(BaseModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=200)
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    vat_number: str | None = Field(default=None, max_length=32)
    address_line1: str | None = None
    address_line2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country_code: str = Field(default="BE", min_length=2, max_length=2)
    is_business: bool = True
    notes: str | None = None


class ClientUpdateRequest(BaseModel):
    """PATCH semantics: only provided fields change. company_id is immutable."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    vat_number: str | None = Field(default=None, max_length=32)
    address_line1: str | None = None
    address_line2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    is_business: bool | None = None
    notes: str | None = None


class ClientResponse(BaseModel):
    id: UUID
    organization_id: UUID
    company_id: UUID
    name: str
    contact_person: str | None
    email: str | None
    phone: str | None
    vat_number: str | None
    address_line1: str | None
    postal_code: str | None
    city: str | None
    country_code: str
    is_business: bool
    notes: str | None
