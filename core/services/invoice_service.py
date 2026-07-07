from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from ..models import (
    AuditAction,
    Currency,
    Discount,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
)
from ..repository import UnitOfWork
from ..rules import InvoiceTotals, invoice_totals
from . import _audit
from .errors import BusinessRuleError, NotFoundError
from .numbering_service import allocate_invoice_numbers

DEFAULT_PAYMENT_TERM_DAYS = 30


class InvoiceService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    @staticmethod
    def preview(
        lines: list[InvoiceLine],
        invoice_discount: Discount | None,
        currency: Currency,
    ) -> InvoiceTotals:
        """Authoritative totals for the UI while composing — no DB access,
        no sequence consumed."""
        return invoice_totals(lines, invoice_discount, currency)

    def create_draft(
        self,
        *,
        company_id: UUID,
        client_id: UUID,
        lines: list[InvoiceLine],
        issue_date: date | None = None,
        due_date: date | None = None,
        invoice_discount: Discount | None = None,
        comments: str | None = None,
        payment_terms: str | None = None,
        pdf_template: str | None = None,
        currency: Currency | None = None,
        actor_user_id: UUID | None = None,
    ) -> Invoice:
        """Create a DRAFT invoice: no gapless number, no VAT force, fully editable
        and deletable (ADR-0002). Totals are computed and stored for display, but
        become legally binding only when ``issue()`` freezes them. ``issue_date``
        here is a provisional/proposed date; ``issue()`` stamps the real one."""
        if not lines:
            raise BusinessRuleError("An invoice needs at least one line")
        issue_date = issue_date or date.today()

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            if client.company_id != company_id:
                raise BusinessRuleError("Client does not belong to this company")

            cur = currency or company.default_currency
            numbered_lines = [
                line.model_copy(update={"line_number": index})
                for index, line in enumerate(lines, start=1)
            ]
            totals = invoice_totals(numbered_lines, invoice_discount, cur)

            invoice = Invoice(
                organization_id=company.organization_id,
                company_id=company_id,
                client_id=client_id,
                reference=None,
                sequence_global=None,
                issue_date=issue_date,
                due_date=due_date,
                currency=cur,
                lines=numbered_lines,
                invoice_discount=invoice_discount,
                comments=comments,
                payment_terms=payment_terms,
                pdf_template=pdf_template or company.default_pdf_template,
                subtotal_ht=totals.subtotal_ht,
                total_discount=totals.total_discount,
                total_vat=totals.total_vat,
                total_ttc=totals.total_ttc,
                status=InvoiceStatus.DRAFT,
            )
            saved = uow.invoices.add(invoice)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="invoice",
                target_id=saved.id,
                after={"status": saved.status, "total_ttc": saved.total_ttc},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def issue(
        self,
        invoice_id: UUID,
        *,
        issue_date: date | None = None,
        due_date: date | None = None,
        actor_user_id: UUID | None = None,
    ) -> Invoice:
        """The load-bearing transition (ADR-0002). A DRAFT becomes an ISSUED VAT
        invoice: the gapless number is consumed *here and only here*, the issue
        date + lines + totals are frozen, and an ``issue`` audit entry is written —
        all in one transaction, so the number is burned only if this commits.

        Pure core: no framework, no network. Peppol delivery is a separate track;
        issuance never waits on it."""
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            if invoice.status is not InvoiceStatus.DRAFT:
                raise BusinessRuleError("Only draft invoices can be issued")

            company = uow.companies.get(invoice.company_id)
            if company is None:
                raise NotFoundError(f"Company {invoice.company_id} not found")
            client = uow.clients.get(invoice.client_id)
            if client is None:
                raise NotFoundError(f"Client {invoice.client_id} not found")

            effective_issue_date = issue_date or invoice.issue_date or date.today()
            effective_due_date = (
                due_date
                or invoice.due_date
                or effective_issue_date + timedelta(days=DEFAULT_PAYMENT_TERM_DAYS)
            )
            totals = invoice_totals(invoice.lines, invoice.invoice_discount, invoice.currency)
            reference, seq_global = allocate_invoice_numbers(
                uow, company, client, effective_issue_date
            )

            issued = invoice.model_copy(
                update={
                    "reference": reference,
                    "sequence_global": seq_global,
                    "issue_date": effective_issue_date,
                    "due_date": effective_due_date,
                    "subtotal_ht": totals.subtotal_ht,
                    "total_discount": totals.total_discount,
                    "total_vat": totals.total_vat,
                    "total_ttc": totals.total_ttc,
                    "status": InvoiceStatus.ISSUED,
                }
            )
            updated = uow.invoices.update(issued)
            _audit.record(
                uow,
                action=AuditAction.ISSUE,
                target_type="invoice",
                target_id=updated.id,
                before={"status": InvoiceStatus.DRAFT},
                after={
                    "reference": updated.reference,
                    "sequence_global": updated.sequence_global,
                    "total_ttc": updated.total_ttc,
                    "status": updated.status,
                },
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return updated

    def delete_draft(self, invoice_id: UUID, actor_user_id: UUID | None = None) -> None:
        """Hard-delete a DRAFT invoice. Issued invoices are never deleted — they
        carry a gapless number and are corrected via a credit note (ADR-0002)."""
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            if invoice.status is not InvoiceStatus.DRAFT:
                raise BusinessRuleError("Only draft invoices can be deleted")
            _audit.record(
                uow,
                action=AuditAction.DELETE,
                target_type="invoice",
                target_id=invoice.id,
                before={"status": invoice.status, "total_ttc": invoice.total_ttc},
                actor_user_id=actor_user_id,
            )
            uow.invoices.delete(invoice_id)
            uow.commit()

    def get(self, invoice_id: UUID) -> Invoice:
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            return invoice

    def list(
        self,
        company_id: UUID | None = None,
        status: InvoiceStatus | None = None,
    ) -> list[Invoice]:
        with self._uow_factory() as uow:
            return uow.invoices.list(company_id=company_id, status=status)

    def void(
        self, invoice_id: UUID, reason: str, actor_user_id: UUID | None = None
    ) -> Invoice:
        """Soft-void. For issued Belgian invoices the legally clean path is a
        credit note (credit_note_service.issue voids and links automatically)."""
        if not reason.strip():
            raise BusinessRuleError("A void reason is required")
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            if invoice.status is InvoiceStatus.VOIDED:
                raise BusinessRuleError("Invoice is already voided")

            voided = invoice.model_copy(
                update={
                    "status": InvoiceStatus.VOIDED,
                    "voided_at": datetime.now(timezone.utc),
                    "voided_reason": reason,
                }
            )
            updated = uow.invoices.update(voided)
            _audit.record(
                uow,
                action=AuditAction.VOID,
                target_type="invoice",
                target_id=invoice.id,
                before={"status": invoice.status},
                after={"status": updated.status, "reason": reason},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return updated
