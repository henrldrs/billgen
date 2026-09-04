"""L4 — the trust surfaces: legal documents, the privacy register, consent
categories and the AI transparency ledger.

**Every route here is public.** Not an oversight: none of it contains customer
data, and all of it has to be readable by someone who has not signed up. A
privacy policy behind a login is not a privacy policy, the subprocessor list is
referenced by a DPA a prospect reads before becoming a customer, and the cookie
banner needs its categories on the marketing site's first paint. That is
ROADMAP_IA §5's "write once, mount twice", implemented as one endpoint rather
than two copies of a document.

The counterpart is `/activity/security` in `routers/activity.py`, which is
emphatically *not* public — it reads one organization's audit log.
"""

from fastapi import APIRouter, HTTPException

from core.trust import ai_transparency, consent, legal, personal_data

from ..schemas.trust import (
    AiSurfaceResponse,
    AiTransparencyResponse,
    ConsentCategoryResponse,
    DataSetResponse,
    LegalDocumentResponse,
    PrivacyRegisterResponse,
    SubprocessorResponse,
)

router = APIRouter(prefix="/trust", tags=["trust"])


def _document(doc: legal.LegalDocument) -> LegalDocumentResponse:
    return LegalDocumentResponse(
        key=doc.key,
        title=doc.title,
        ia_path=doc.ia_path,
        audience=doc.audience.value,
        requires_acceptance=doc.requires_acceptance,
        drafted=doc.drafted,
        version=doc.version,
        effective_date=doc.effective_date,
        blocks=list(doc.blocks),
        note=doc.note,
    )


@router.get("/legal/documents", response_model=list[LegalDocumentResponse])
def list_legal_documents() -> list[LegalDocumentResponse]:
    """The seven documents, drafted or not.

    Returns the undrafted ones too, with `drafted: false`. Hiding them would
    make the endpoint agree with the marketing site's footer and disagree with
    reality — the list of what is missing is the useful half right now.
    """
    return [_document(doc) for doc in legal.documents()]


@router.get("/legal/documents/{key}", response_model=LegalDocumentResponse)
def get_legal_document(key: str) -> LegalDocumentResponse:
    doc = legal.document(key)
    if doc is None:
        raise HTTPException(status_code=404, detail="No such legal document")
    return _document(doc)


@router.get("/subprocessors", response_model=list[SubprocessorResponse])
def list_subprocessors() -> list[SubprocessorResponse]:
    """Every third party, live or planned.

    `in_use` separates the two. A planned subprocessor published as a current
    one is a false statement in a document the DPA points at, so the flag
    travels with the row rather than being decided by the caller.
    """
    return [
        SubprocessorResponse(
            name=s.name, purpose=s.purpose, location=s.location, in_use=s.in_use
        )
        for s in personal_data.subprocessors()
    ]


@router.get("/privacy/register", response_model=PrivacyRegisterResponse)
def get_privacy_register() -> PrivacyRegisterResponse:
    """The GDPR art. 30 register, as data rather than as a Word file."""
    return PrivacyRegisterResponse(
        datasets=[
            DataSetResponse(
                key=ds.key,
                label=ds.label,
                subject=ds.subject,
                fields=list(ds.fields),
                purpose=ds.purpose,
                basis=ds.basis.value,
                retention=ds.retention,
                exportable=ds.exportable,
                erasure=ds.erasure.value,
                source=ds.source,
                note=ds.note,
            )
            for ds in personal_data.register()
        ],
        retained_on_erasure=[ds.key for ds in personal_data.retained_on_erasure()],
        subprocessors=[
            SubprocessorResponse(
                name=s.name, purpose=s.purpose, location=s.location, in_use=s.in_use
            )
            for s in personal_data.subprocessors()
        ],
    )


@router.get("/consent/categories", response_model=list[ConsentCategoryResponse])
def list_consent_categories() -> list[ConsentCategoryResponse]:
    """What a cookie banner would offer, and what actually runs in each row.

    Three of the four categories have an empty `in_use` today. That is the
    honest state of the product and the reason no banner is shipped yet — not
    a placeholder to be filled in with plausible-sounding trackers.
    """
    return [
        ConsentCategoryResponse(
            category=info.category.value,
            label=info.label,
            purpose=info.purpose,
            essential=info.essential,
            default_on=info.default_on,
            in_use=list(info.in_use),
        )
        for info in consent.categories()
    ]


@router.get("/ai-transparency", response_model=AiTransparencyResponse)
def get_ai_transparency() -> AiTransparencyResponse:
    """Which outputs are machine-made, and whether the marking duty is live.

    `obligation_live` lets one screen render a countdown before the date and an
    obligation after it. BillGen marks either way; the flag decides the wording,
    not the marker.
    """
    return AiTransparencyResponse(
        obligation_date=ai_transparency.TRANSPARENCY_OBLIGATION_DATE,
        obligation_live=ai_transparency.marking_due(),
        surfaces=[
            AiSurfaceResponse(
                key=s.key,
                label=s.label,
                produces=s.produces,
                module=s.module,
                risk=s.risk.value,
                confidence_field=s.confidence_field,
                human_confirms=s.human_confirms,
                requires_marking=s.requires_marking,
                crosses_annex_iii=s.crosses_annex_iii,
                note=s.note,
            )
            for s in ai_transparency.surfaces()
        ],
    )
