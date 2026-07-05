from decimal import Decimal

import pytest

from core.models import InvoiceStatus
from core.services import BusinessRuleError, CreditNoteService, InvoiceService

from .conftest import ISSUE_DATE, make_lines


def _issue_invoice(env):
    return InvoiceService(env.uow_factory).create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )


def test_issue_credit_note_voids_and_links_invoice(env):
    invoice = _issue_invoice(env)
    service = CreditNoteService(env.uow_factory)

    credit_note = service.issue(
        invoice_id=invoice.id, reason="Client cancelled the engagement",
        issue_date=ISSUE_DATE,
    )
    assert credit_note.reference == "CN-ACME-2026/0001"
    assert credit_note.sequence_global == 1
    assert credit_note.total_ttc == Decimal("1512.50")
    assert len(credit_note.lines) == len(invoice.lines)

    updated = InvoiceService(env.uow_factory).get(invoice.id)
    assert updated.status is InvoiceStatus.VOIDED
    assert updated.voided_by_credit_note_id == credit_note.id
    assert updated.voided_reason == "Client cancelled the engagement"


def test_credit_note_series_is_independent_of_invoices(env):
    invoice = _issue_invoice(env)
    second_invoice = _issue_invoice(env)
    service = CreditNoteService(env.uow_factory)

    first_cn = service.issue(invoice_id=invoice.id, reason="r1", issue_date=ISSUE_DATE)
    second_cn = service.issue(
        invoice_id=second_invoice.id, reason="r2", issue_date=ISSUE_DATE
    )
    assert (first_cn.sequence_global, second_cn.sequence_global) == (1, 2)
    assert second_cn.reference == "CN-ACME-2026/0002"


def test_issue_on_voided_invoice_raises(env):
    invoice = _issue_invoice(env)
    service = CreditNoteService(env.uow_factory)
    service.issue(invoice_id=invoice.id, reason="first", issue_date=ISSUE_DATE)
    with pytest.raises(BusinessRuleError):
        service.issue(invoice_id=invoice.id, reason="second", issue_date=ISSUE_DATE)


def test_audit_entries_written_for_both_documents(env):
    invoice = _issue_invoice(env)
    CreditNoteService(env.uow_factory).issue(
        invoice_id=invoice.id, reason="cancel", issue_date=ISSUE_DATE
    )
    with env.uow_factory() as uow:
        cn_entries = uow.audit_log.list(target_type="credit_note")
        invoice_entries = uow.audit_log.list(target_type="invoice")
    assert len(cn_entries) == 1
    actions = {entry.action.value for entry in invoice_entries}
    assert "void" in actions
