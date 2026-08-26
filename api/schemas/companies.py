from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from core.pdf.registry import TEMPLATES


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


class CompanyUpdateRequest(BaseModel):
    """PATCH semantics: only provided fields change (B3).

    `organization_id` and `id` are immutable. `logo_key` is deliberately absent —
    it is set by blob storage (B2), not by the client.
    """

    name: str | None = Field(default=None, min_length=1, max_length=200)
    legal_name: str | None = None
    vat_number: str | None = Field(default=None, max_length=32)
    registration_number: str | None = Field(default=None, max_length=64)
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    iban: str | None = Field(default=None, max_length=34)
    bic: str | None = Field(default=None, max_length=11)
    default_currency: str | None = None
    default_language: str | None = Field(default=None, pattern=r"^(en|fr|nl|es)$")
    default_pdf_template: str | None = None
    invoice_reference_prefix: str | None = Field(default=None, max_length=8)

    @field_validator("default_pdf_template")
    @classmethod
    def _known_template(cls, value: str | None) -> str | None:
        # A company whose default template does not exist renders no PDF at all,
        # and the failure surfaces far from here. Reject it at the edge.
        if value is not None and value not in TEMPLATES:
            raise ValueError(f"Unknown PDF template '{value}'")
        return value


class CompanyResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    legal_name: str | None
    vat_number: str | None
    registration_number: str | None
    email: str | None
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    postal_code: str | None
    city: str | None
    country_code: str
    iban: str | None
    bic: str | None
    default_currency: str
    default_language: str
    default_pdf_template: str
    invoice_reference_prefix: str
