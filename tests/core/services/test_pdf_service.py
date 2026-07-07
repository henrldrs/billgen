from decimal import Decimal

import pytest

import core.services.pdf_service as pdf_service_module
from core.models import Discount, DiscountType
from core.services import (
    BusinessRuleError,
    CreditNoteService,
    InvoiceService,
    PdfService,
)

from .conftest import ISSUE_DATE, issue_invoice, make_lines


def _weasyprint_available() -> bool:
    try:
        import weasyprint  # noqa: F401, PLC0415

        return True
    except Exception:
        return False


def _issue_invoice(env, **kwargs):
    return issue_invoice(
        env.uow_factory,
        company_id=env.company.id,
        client_id=env.client.id,
        issue_date=ISSUE_DATE,
        **kwargs,
    )


def test_fr_standard_html_contains_key_facts(env):
    invoice = _issue_invoice(env)
    html = PdfService(env.uow_factory).render_invoice_html(invoice.id)
    assert "FACTURE" in html
    assert invoice.reference in html
    assert "Big Corp" in html
    assert "1 512,50 €" in html  # fr formatting, NBSP separators
    assert "04/07/2026" in html


def test_draft_html_is_watermarked_not_a_valid_invoice(env):
    draft = InvoiceService(env.uow_factory).create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    html = PdfService(env.uow_factory).render_invoice_html(draft.id)
    # Jinja escapes the apostrophe; match the escaping-safe part of the phrase.
    assert "PAS UNE FACTURE VALIDE" in html  # fr_standard draft watermark
    assert '<div class="draft-watermark">' in html


def test_issued_html_has_no_watermark(env):
    invoice = _issue_invoice(env)
    html = PdfService(env.uow_factory).render_invoice_html(invoice.id)
    # The watermark overlay div is only emitted for drafts (the CSS class always
    # sits in <style>, so assert on the element, not the selector).
    assert '<div class="draft-watermark">' not in html
    assert "PAS UNE FACTURE VALIDE" not in html


def test_fr_detailed_has_vat_column_and_terms(env):
    invoice = _issue_invoice(env, payment_terms="Paiement à 30 jours")
    html = PdfService(env.uow_factory).render_invoice_html(invoice.id, "fr_detailed")
    assert "TVA %" in html
    assert "Conditions de paiement" in html
    assert "Paiement à 30 jours" in html


def test_nl_minimal_is_dutch(env):
    invoice = _issue_invoice(env)
    html = PdfService(env.uow_factory).render_invoice_html(invoice.id, "nl_minimal")
    assert "FACTUUR" in html
    assert "Omschrijving" in html
    assert "BTW 21%" in html


def test_discount_shows_in_totals(env):
    invoice = _issue_invoice(
        env,
        invoice_discount=Discount(type=DiscountType.PERCENTAGE, value=Decimal("10")),
    )
    html = PdfService(env.uow_factory).render_invoice_html(invoice.id)
    assert "Remise" in html
    assert "125,00" in html  # 10% of 1250.00


def test_unknown_template_raises(env):
    invoice = _issue_invoice(env)
    with pytest.raises(BusinessRuleError):
        PdfService(env.uow_factory).render_invoice_html(invoice.id, "does_not_exist")


def test_credit_note_html_references_original(env):
    invoice = _issue_invoice(env)
    credit_note = CreditNoteService(env.uow_factory).issue(
        invoice_id=invoice.id, reason="Erreur de facturation", issue_date=ISSUE_DATE
    )
    html = PdfService(env.uow_factory).render_credit_note_html(credit_note.id)
    assert "NOTE DE CRÉDIT" in html
    assert credit_note.reference in html
    assert invoice.reference in html
    assert "Erreur de facturation" in html


def test_html_preview_writes_no_audit_and_burns_no_sequence(env):
    invoice = _issue_invoice(env)
    PdfService(env.uow_factory).render_invoice_html(invoice.id)

    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert all(entry.action.value != "export_pdf" for entry in entries)

    second = _issue_invoice(env)
    assert second.sequence_global == invoice.sequence_global + 1


def test_pdf_export_is_audited(env, monkeypatch):
    # Engine-independent: stub the HTML->PDF step so the audit path is testable
    # on machines without the native Pango stack.
    monkeypatch.setattr(pdf_service_module, "html_to_pdf", lambda html: b"%PDF-fake")
    invoice = _issue_invoice(env)
    pdf = PdfService(env.uow_factory).render_invoice_pdf(invoice.id)
    assert pdf.startswith(b"%PDF")

    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert any(entry.action.value == "export_pdf" for entry in entries)


@pytest.mark.skipif(not _weasyprint_available(), reason="WeasyPrint native stack absent")
def test_real_pdf_bytes(env):
    invoice = _issue_invoice(env)
    pdf = PdfService(env.uow_factory).render_invoice_pdf(invoice.id)
    assert pdf.startswith(b"%PDF")
