from decimal import Decimal

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
