"""Read-only reference data the frontends would otherwise hardcode.

Both sets already existed as Python constants (`core.rules.vat`,
`core.pdf.registry.TEMPLATES`); nothing here is a new source of truth. The point
is that `21/12/6/0` and the template ids stop being duplicated in TypeScript,
where they drift silently.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.models import VATCategory
from core.pdf.registry import TEMPLATES
from core.repository import UnitOfWork
from core.repository.sequence_repo import (
    CREDIT_NOTE_SERIES,
    INVOICE_SERIES,
    QUOTE_SERIES,
)
from core.rules import legal_mention_for
from core.rules.vat import (
    BELGIAN_STANDARD_RATES,
    build_rate,
    default_rate_for_belgium,
    pick_category,
)
from core.services import ClientService, CompanyService

from ..deps import get_uow_factory
from ..schemas.reference import (
    PdfTemplateOption,
    PdfTemplatesResponse,
    SequenceEntry,
    SequencesResponse,
    VatCategoryOption,
    VatRateOption,
    VatRatesResponse,
    VatTreatmentResponse,
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


# Why a treatment applies, as a message key the frontends translate. The pair
# (category, reason) is what an accountant reads back: "AE because intra-EU
# B2B" is checkable, "AE" alone is not.
_REASONS: dict[VATCategory, str] = {
    VATCategory.STANDARD: "vat.reason.domestic",
    VATCategory.REVERSE_CHARGE: "vat.reason.intra_eu_b2b",
    VATCategory.EXPORT: "vat.reason.outside_eu",
}


@router.get("/vat-treatment", response_model=VatTreatmentResponse)
def vat_treatment(
    company_id: UUID,
    client_id: UUID,
    lang: str | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
) -> VatTreatmentResponse:
    """Which VAT category this seller/buyer pair implies, and the mention it needs.

    `core.rules.vat.pick_category` has existed since the domain was written and
    no route called it, so every invoice line shipped `category: "S"` — correct
    for a Belgian seller billing a Belgian customer, and wrong for the two cases
    that make the rule worth having: intra-EU B2B, which is reverse-charged and
    carries a mandatory Article 51 §2 mention, and export outside the EU.

    Advisory on purpose. This does not overwrite what the composer sends: the
    caller knows things the data does not (a client flagged as a business that
    is buying privately, an exemption that turns on the service). Defaulting is
    the job; deciding is not.
    """
    company = CompanyService(uow_factory).get(company_id)
    client = ClientService(uow_factory).get(client_id)

    category = pick_category(
        client_is_business=client.is_business,
        client_country=client.country_code,
        client_has_vat_number=bool(client.vat_number),
        seller_country=company.country_code,
    )
    rate = build_rate(category, seller_country=company.country_code)
    language = lang or company.default_language

    return VatTreatmentResponse(
        category=category.value,
        category_name=category.name,
        rate=rate.rate,
        legal_mention=legal_mention_for(category, language),
        reason=_REASONS.get(category, "vat.reason.standard"),
        seller_country=company.country_code.upper(),
        buyer_country=client.country_code.upper(),
    )


@router.get("/sequences", response_model=SequencesResponse)
def sequences(
    company_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Where each numbering series currently stands.

    Read-only, and deliberately so: `next_value` allocates inside the
    transaction that consumes it (ADR-0001's gapless rule), so anything here
    that could increment a counter would mint a hole in a legal series. This
    reads `snapshot`, which the backup path has used since ADR-0003.

    A series absent from the table has never been used, and is reported at zero
    rather than omitted — the numbering screen needs to show every series a
    company has, including the ones it has not started.
    """
    with uow_factory() as uow:
        counters = uow.sequences.snapshot(company_id)

    return SequencesResponse(
        company_id=company_id,
        series=[
            SequenceEntry(
                scope=scope,
                current=counters.get(scope, 0),
                next=counters.get(scope, 0) + 1,
            )
            for scope in (INVOICE_SERIES, QUOTE_SERIES, CREDIT_NOTE_SERIES)
        ],
    )
