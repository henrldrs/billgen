from collections.abc import Callable
from datetime import date, datetime, timezone
from uuid import UUID

from ..models import AuditAction, CreditNote, CreditNoteLine, InvoiceStatus
from ..repository import UnitOfWork
from . import _audit
from .errors import BusinessRuleError, NotFoundError
from .numbering_service import allocate_credit_note_numbers


class CreditNoteService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def issue(
        self,
        *,
        invoice_id: UUID,
        reason: str,
        issue_date: date | None = None,
        actor_user_id: UUID | None = None,
    ) -> CreditNote:
        """Issue a full credit note (avoir) that cancels an invoice.

        Lines are mirrored from the invoice; totals are copied from the
        invoice's stored totals, which remain authoritative even when the
        invoice carried a document-level discount that individual lines can't
        express. The invoice is voided and linked in the same transaction."""
        if not reason.strip():
            raise BusinessRuleError("A credit note reason is required")
        issue_date = issue_date or date.today()

        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            if invoice.status is InvoiceStatus.VOIDED:
                raise BusinessRuleError("Invoice is already voided")
            company = uow.companies.get(invoice.company_id)
            if company is None:
                raise NotFoundError(f"Company {invoice.company_id} not found")

            reference, seq_global = allocate_credit_note_numbers(uow, company, issue_date)
            credit_note = CreditNote(
                organization_id=invoice.organization_id,
                company_id=invoice.company_id,
                client_id=invoice.client_id,
                invoice_id=invoice.id,
                reference=reference,
                sequence_global=seq_global,
                issue_date=issue_date,
                reason=reason,
                currency=invoice.currency,
                lines=[
                    CreditNoteLine(
                        line_number=line.line_number,
                        description=line.description,
                        quantity=line.quantity,
                        unit_price=line.unit_price,
                        product_id=line.product_id,
                        vat=line.vat,
                    )
                    for line in invoice.lines
                ],
                subtotal_ht=invoice.subtotal_ht,
                total_vat=invoice.total_vat,
                total_ttc=invoice.total_ttc,
            )
            saved = uow.credit_notes.add(credit_note)

            voided = invoice.model_copy(
                update={
                    "status": InvoiceStatus.VOIDED,
                    "voided_at": datetime.now(timezone.utc),
                    "voided_reason": reason,
                    "voided_by_credit_note_id": saved.id,
                }
            )
            uow.invoices.update(voided)

            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="credit_note",
                target_id=saved.id,
                after={
                    "reference": saved.reference,
                    "invoice_reference": invoice.reference,
                    "total_ttc": saved.total_ttc,
                },
                actor_user_id=actor_user_id,
            )
            _audit.record(
                uow,
                action=AuditAction.VOID,
                target_type="invoice",
                target_id=invoice.id,
                before={"status": invoice.status},
                after={"status": InvoiceStatus.VOIDED, "credit_note": saved.reference},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def get(self, credit_note_id: UUID) -> CreditNote:
        with self._uow_factory() as uow:
            credit_note = uow.credit_notes.get(credit_note_id)
            if credit_note is None:
                raise NotFoundError(f"Credit note {credit_note_id} not found")
            return credit_note

    def list(self, company_id: UUID | None = None) -> list[CreditNote]:
        with self._uow_factory() as uow:
            return uow.credit_notes.list(company_id=company_id)
