from uuid import UUID

from pydantic import BaseModel, Field


class CompanyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    legal_name: str | None = None
    vat_number: str | None = Field(default=None, max_length=32)
    registration_number: str | None = Field(default=None, max_length=64)
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country_code: str = Field(default="BE", min_length=2, max_length=2)
    iban: str | None = Field(default=None, max_length=34)
    bic: str | None = Field(default=None, max_length=11)
    default_currency: str = "EUR"
    default_language: str = Field(default="fr", pattern=r"^(en|fr|nl|es)$")
    default_pdf_template: str = "fr_standard"
    invoice_reference_prefix: str = Field(default="", max_length=8)


class CompanyResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    legal_name: str | None
    vat_number: str | None
    email: str | None
    address_line1: str | None
    postal_code: str | None
    city: str | None
    country_code: str
    iban: str | None
    bic: str | None
    default_currency: str
    default_language: str
    default_pdf_template: str
    invoice_reference_prefix: str
