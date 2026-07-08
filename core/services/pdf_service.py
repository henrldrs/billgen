from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Client, Company, CreditNote, Invoice, PlanTier
from ..pdf import (
    UnknownTemplateError,
    build_credit_note_context,
    build_invoice_context,
    get_template,
    html_to_pdf,
    render_html,
)
from ..repository import UnitOfWork
from . import _audit
from .errors import BusinessRuleError, NotFoundError


class PdfService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def _load_invoice(
        self, uow: UnitOfWork, invoice_id: UUID
    ) -> tuple[Invoice, Company, Client]:
        invoice = uow.invoices.get(invoice_id)
        if invoice is None:
            raise NotFoundError(f"Invoice {invoice_id} not found")
        company = uow.companies.get(invoice.company_id)
        client = uow.clients.get(invoice.client_id)
        if company is None or client is None:
            raise NotFoundError("Invoice company or client missing")
        return invoice, company, client

    def _branded(self, uow: UnitOfWork, organization_id: UUID) -> bool:
        """BillGen branding appears on free-tier documents only, whatever the
        template; paid tiers get unbranded output. Unknown org → branded (safe)."""
        organization = uow.organizations.get(organization_id)
        return organization is None or organization.plan_tier is PlanTier.FREE

    def _invoice_html(
        self, uow: UnitOfWork, invoice_id: UUID, template_id: str | None
    ) -> tuple[str, Invoice]:
        invoice, company, client = self._load_invoice(uow, invoice_id)
        try:
            spec = get_template(template_id or invoice.pdf_template)
        except UnknownTemplateError as exc:
            raise BusinessRuleError(f"Unknown PDF template: {exc.args[0]}") from exc
        context = build_invoice_context(
            invoice, company, client, spec,
            branded=self._branded(uow, invoice.organization_id),
        )
        return render_html(spec.filename, context), invoice

    def render_invoice_html(self, invoice_id: UUID, template_id: str | None = None) -> str:
        """Preview — read-only, no audit entry, never consumes a sequence."""
        with self._uow_factory() as uow:
            html, _ = self._invoice_html(uow, invoice_id, template_id)
            return html

    def render_invoice_pdf(
        self,
        invoice_id: UUID,
        template_id: str | None = None,
        actor_user_id: UUID | None = None,
    ) -> bytes:
        """Export — audited (EXPORT_PDF). Re-export never touches sequences."""
        with self._uow_factory() as uow:
            html, invoice = self._invoice_html(uow, invoice_id, template_id)
            pdf = html_to_pdf(html)
            _audit.record(
                uow,
                action=AuditAction.EXPORT_PDF,
                target_type="invoice",
                target_id=invoice.id,
                after={"reference": invoice.reference, "template": template_id or invoice.pdf_template},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return pdf

    def _credit_note_html(self, uow: UnitOfWork, credit_note_id: UUID) -> tuple[str, CreditNote]:
        credit_note = uow.credit_notes.get(credit_note_id)
        if credit_note is None:
            raise NotFoundError(f"Credit note {credit_note_id} not found")
        company = uow.companies.get(credit_note.company_id)
        client = uow.clients.get(credit_note.client_id)
        original = uow.invoices.get(credit_note.invoice_id)
        if company is None or client is None or original is None:
            raise NotFoundError("Credit note company, client, or invoice missing")
        spec = get_template(credit_note.pdf_template)
        context = build_credit_note_context(
            credit_note, company, client, original, spec,
            branded=self._branded(uow, credit_note.organization_id),
        )
        return render_html(spec.filename, context), credit_note

    def render_credit_note_html(self, credit_note_id: UUID) -> str:
        with self._uow_factory() as uow:
            html, _ = self._credit_note_html(uow, credit_note_id)
            return html

    def render_credit_note_pdf(
        self, credit_note_id: UUID, actor_user_id: UUID | None = None
    ) -> bytes:
        with self._uow_factory() as uow:
            html, credit_note = self._credit_note_html(uow, credit_note_id)
            pdf = html_to_pdf(html)
            _audit.record(
                uow,
                action=AuditAction.EXPORT_PDF,
                target_type="credit_note",
                target_id=credit_note.id,
                after={"reference": credit_note.reference},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return pdf
