from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class VatRateOption(BaseModel):
    rate: Decimal
    label: str
    is_default: bool


class VatCategoryOption(BaseModel):
    code: str
    name: str
    label: str


class VatRatesResponse(BaseModel):
    country_code: str
    rates: list[VatRateOption]
    categories: list[VatCategoryOption]


class PdfTemplateOption(BaseModel):
    id: str
    lang: str
    doc_title: str


class PdfTemplatesResponse(BaseModel):
    templates: list[PdfTemplateOption]
    default_template: str


class VatTreatmentResponse(BaseModel):
    """The VAT treatment a given seller/buyer pair implies.

    Advisory, not enforced: the composer uses it to default a line, and a user
    who knows their case better may still override. `reason` is a message key,
    so the explanation is translated in the frontend rather than here.
    """

    category: str
    category_name: str
    rate: Decimal
    legal_mention: str | None
    reason: str
    seller_country: str
    buyer_country: str


class SequenceEntry(BaseModel):
    """One numbering series and where it currently stands."""

    scope: str
    #  What the last document of this series was numbered. 0 means the series
    #  has never been used.
    current: int
    #  What the next one will get. Sent rather than left as current + 1: the
    #  screen's whole question is "what will the next invoice be called", and a
    #  client that has to add one is a client that can add one in the wrong
    #  place.
    next: int


class SequencesResponse(BaseModel):
    company_id: UUID
    series: list[SequenceEntry]
