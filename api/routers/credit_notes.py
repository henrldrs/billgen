from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from core.models import CreditNote
from core.repository import UnitOfWork
from core.services import CreditNoteService, PdfService

from ..deps import current_user_id, get_uow_factory
from ..entitlements import pdf_branded
from ..schemas.credit_notes import CreditNoteIssueRequest, CreditNoteResponse

router = APIRouter(prefix="/credit-notes", tags=["credit-notes"])


def _to_response(credit_note: CreditNote) -> CreditNoteResponse:
    return CreditNoteResponse.model_validate(credit_note.model_dump())


@router.post("", response_model=CreditNoteResponse, status_code=201)
def issue_credit_note(
    body: CreditNoteIssueRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    credit_note = CreditNoteService(uow_factory).issue(
        invoice_id=body.invoice_id,
        reason=body.reason,
        issue_date=body.issue_date,
        actor_user_id=user_id,
    )
    return _to_response(credit_note)


@router.get("", response_model=list[CreditNoteResponse])
def list_credit_notes(
    company_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    notes = CreditNoteService(uow_factory).list(company_id=company_id)
    return [_to_response(note) for note in notes]


@router.get("/{credit_note_id}", response_model=CreditNoteResponse)
def get_credit_note(
    credit_note_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(CreditNoteService(uow_factory).get(credit_note_id))


@router.get("/{credit_note_id}/html")
def credit_note_html(
    credit_note_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    branded: bool = Depends(pdf_branded),
):
    html = PdfService(uow_factory, branded=branded).render_credit_note_html(credit_note_id)
    return Response(content=html, media_type="text/html")


@router.get("/{credit_note_id}/pdf")
def credit_note_pdf(
    credit_note_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    branded: bool = Depends(pdf_branded),
):
    service = CreditNoteService(uow_factory)
    credit_note = service.get(credit_note_id)
    pdf = PdfService(uow_factory, branded=branded).render_credit_note_pdf(
        credit_note_id, actor_user_id=user_id
    )
    filename = credit_note.reference.replace("/", "-")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )
