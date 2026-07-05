from uuid import UUID

from pydantic import Field

from ._base import TenantModel


class Client(TenantModel):
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
