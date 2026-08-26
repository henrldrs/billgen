"""Read-only reference data the frontends would otherwise hardcode.

Both sets already existed as Python constants (`core.rules.vat`,
`core.pdf.registry.TEMPLATES`); nothing here is a new source of truth. The point
is that `21/12/6/0` and the template ids stop being duplicated in TypeScript,
where they drift silently.
"""

from fastapi import APIRouter

from core.models import VATCategory
from core.pdf.registry import TEMPLATES
from core.rules.vat import BELGIAN_STANDARD_RATES, default_rate_for_belgium

from ..schemas.reference import (
    PdfTemplateOption,
    PdfTemplatesResponse,
    VatCategoryOption,
    VatRateOption,
    VatRatesResponse,
)

router = APIRouter(tags=["reference"])

_DEFAULT_PDF_TEMPLATE = "fr_standard"


@router.get("/vat-rates", response_model=VatRatesResponse)
def list_vat_rates() -> VatRatesResponse:
    default = default_rate_for_belgium(VATCategory.STANDARD)
    return VatRatesResponse(
        country_code="BE",
        rates=[
            VatRateOption(
                rate=rate,
                label=f"{rate.normalize():f}%",
                is_default=rate == default,
            )
            for rate in BELGIAN_STANDARD_RATES
        ],
        categories=[
            VatCategoryOption(
                code=category.value,
                name=category.name,
                label=category.name.replace("_", " ").capitalize(),
            )
            for category in VATCategory
        ],
    )


@router.get("/pdf-templates", response_model=PdfTemplatesResponse)
def list_pdf_templates() -> PdfTemplatesResponse:
    return PdfTemplatesResponse(
        templates=[
            PdfTemplateOption(id=spec.id, lang=spec.lang, doc_title=spec.doc_title)
            for spec in TEMPLATES.values()
        ],
        default_template=_DEFAULT_PDF_TEMPLATE,
    )
