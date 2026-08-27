from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response

from core.models import Currency, Discount, Invoice, InvoiceLine, InvoiceStatus, VATRate
from core.repository import UnitOfWork
from core.services import InvoiceService, PdfService, PeppolService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..entitlements import Meter, pdf_branded, require_peppol_quota, require_quota
from ..schemas.invoices import (
    DiscountIn,
    InvoiceCreateRequest,
    InvoiceLineIn,
    InvoicePreviewRequest,
    InvoicePreviewResponse,
    InvoiceResponse,
    IssueRequest,
    VoidRequest,
)

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _parse_currency(value: str | None) -> Currency | None:
    if value is None:
        return None
    try:
        return Currency(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown currency: {value}") from None


def _to_core_lines(lines_in: list[InvoiceLineIn]) -> list[InvoiceLine]:
    return [
        InvoiceLine(
            line_number=index,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            product_id=line.product_id,
            vat=VATRate.model_validate(line.vat.model_dump()),
            discount=(
                Discount.model_validate(line.discount.model_dump())
                if line.discount
                else None
            ),
        )
        for index, line in enumerate(lines_in, start=1)
    ]


def _to_core_discount(discount: DiscountIn | None) -> Discount | None:
    return Discount.model_validate(discount.model_dump()) if discount else None


def _to_response(invoice: Invoice) -> InvoiceResponse:
    return InvoiceResponse.model_validate(invoice.model_dump())


@router.post("/preview", response_model=InvoicePreviewResponse)
def preview(body: InvoicePreviewRequest):
    """Authoritative totals while composing. No DB write, no sequence consumed."""
    currency = _parse_currency(body.currency) or Currency.EUR
    totals = InvoiceService.preview(
        _to_core_lines(body.lines), _to_core_discount(body.invoice_discount), currency
    )
    return InvoicePreviewResponse(
        subtotal_ht=totals.subtotal_ht,
        total_discount=totals.total_discount,
        net_ht=totals.net_ht,
        total_vat=totals.total_vat,
        total_ttc=totals.total_ttc,
        vat_breakdown={str(rate): amount for rate, amount in totals.vat_breakdown.items()},
    )


@router.post("", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    body: InvoiceCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_WRITE)),
    _quota: None = Depends(require_quota(Meter.INVOICES)),
):
    """Create a DRAFT invoice — no number is consumed. Finalize it with
    POST /invoices/{id}/issue.

    The monthly invoice allowance is consumed **here**, at creation, not at
    issue. Issuing is the legally load-bearing act and must never be the step
    that fails for a commercial reason: a Belgian sole trader who has drafted an
    invoice has to be able to finalize it."""
    invoice = InvoiceService(uow_factory).create_draft(
        company_id=body.company_id,
        client_id=body.client_id,
        lines=_to_core_lines(body.lines),
        issue_date=body.issue_date,
        due_date=body.due_date,
        invoice_discount=_to_core_discount(body.invoice_discount),
        comments=body.comments,
        payment_terms=body.payment_terms,
        pdf_template=body.pdf_template,
        currency=_parse_currency(body.currency),
        actor_user_id=user_id,
    )
    return _to_response(invoice)


@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice(
    invoice_id: UUID,
    body: IssueRequest | None = None,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_ISSUE)),
):
    """Issue a draft: consume the gapless number, freeze totals, set ISSUED."""
    body = body or IssueRequest()
    invoice = InvoiceService(uow_factory).issue(
        invoice_id,
        issue_date=body.issue_date,
        due_date=body.due_date,
        actor_user_id=user_id,
    )
    return _to_response(invoice)


@router.post("/{invoice_id}/duplicate", response_model=InvoiceResponse, status_code=201)
def duplicate_invoice(
    invoice_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_WRITE)),
    _quota: None = Depends(require_quota(Meter.INVOICES)),
):
    """Copy an invoice into a new DRAFT dated today. No number is consumed and
    nothing on the source changes — including an issued or voided source, which
    is the common case (re-billing last month's work)."""
    invoice = InvoiceService(uow_factory).duplicate(invoice_id, actor_user_id=user_id)
    return _to_response(invoice)


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_WRITE)),
):
    """Hard-delete a DRAFT invoice. Issued invoices return 409 (never deleted)."""
    InvoiceService(uow_factory).delete_draft(invoice_id, actor_user_id=user_id)
    return Response(status_code=204)


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    company_id: UUID | None = None,
    status: InvoiceStatus | None = None,
    client_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    invoices = InvoiceService(uow_factory).list(
        company_id=company_id, status=status, client_id=client_id
    )
    return [_to_response(invoice) for invoice in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(InvoiceService(uow_factory).get(invoice_id))


@router.post("/{invoice_id}/void", response_model=InvoiceResponse)
def void_invoice(
    invoice_id: UUID,
    body: VoidRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.INVOICE_VOID)),
):
    return _to_response(
        InvoiceService(uow_factory).void(invoice_id, body.reason, actor_user_id=user_id)
    )


@router.get("/{invoice_id}/html")
def invoice_html(
    invoice_id: UUID,
    template: str | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    branded: bool = Depends(pdf_branded),
):
    html = PdfService(uow_factory, branded=branded).render_invoice_html(
        invoice_id, template
    )
    return Response(content=html, media_type="text/html")


@router.get("/{invoice_id}/pdf")
def invoice_pdf(
    invoice_id: UUID,
    template: str | None = None,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    branded: bool = Depends(pdf_branded),
):
    service = PdfService(uow_factory, branded=branded)
    invoice = InvoiceService(uow_factory).get(invoice_id)
    pdf = service.render_invoice_pdf(invoice_id, template, actor_user_id=user_id)
    # Drafts have no reference yet (assigned at issue time).
    reference = invoice.reference or f"draft-{invoice_id.hex[:8]}"
    filename = reference.replace("/", "-")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )


@router.get("/{invoice_id}/peppol.xml")
def invoice_peppol(
    invoice_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _quota: None = Depends(require_peppol_quota),
):
    """Peppol BIS 3.0 XML. Every tier can do this — Peppol is the Belgian
    differentiator, not an upsell — but the monthly *document* allowance
    applies: distinct invoices exported this period, counted from the
    EXPORT_PEPPOL audit entries. Re-downloading an invoice already exported
    this period is free, even at the cap."""
    invoice = InvoiceService(uow_factory).get(invoice_id)
    xml = PeppolService(uow_factory).generate_invoice_xml(invoice_id, actor_user_id=user_id)
    # Drafts have no reference yet (assigned at issue time).
    reference = invoice.reference or f"draft-{invoice_id.hex[:8]}"
    filename = reference.replace("/", "-")
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.xml"'},
    )
