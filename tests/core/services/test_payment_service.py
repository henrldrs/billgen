from datetime import date
from decimal import Decimal

import pytest

from core.models import InvoiceStatus
from core.services import BusinessRuleError, InvoiceService, PaymentService

from .conftest import issue_invoice

PAID_ON = date(2026, 7, 20)


def _issue_invoice(env):
    return issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id
    )


def test_partial_then_full_payment(env):
    invoice = _issue_invoice(env)
    service = PaymentService(env.uow_factory)

    _, after_partial = service.record(
        invoice_id=invoice.id, amount=Decimal("500.00"), paid_on=PAID_ON
    )
    assert after_partial.status is InvoiceStatus.PARTIALLY_PAID

    _, after_full = service.record(
        invoice_id=invoice.id, amount=Decimal("1012.50"), paid_on=PAID_ON
    )
    assert after_full.status is InvoiceStatus.PAID

    payments = service.list_for_invoice(invoice.id)
    assert sum(p.amount for p in payments) == Decimal("1512.50")


def test_overpayment_rejected(env):
    invoice = _issue_invoice(env)
    service = PaymentService(env.uow_factory)
    with pytest.raises(BusinessRuleError):
        service.record(
            invoice_id=invoice.id, amount=Decimal("2000.00"), paid_on=PAID_ON
        )


def test_payment_on_voided_invoice_rejected(env):
    invoice = _issue_invoice(env)
    InvoiceService(env.uow_factory).void(invoice.id, "cancelled")
    service = PaymentService(env.uow_factory)
    with pytest.raises(BusinessRuleError):
        service.record(
            invoice_id=invoice.id, amount=Decimal("100.00"), paid_on=PAID_ON
        )


def test_payment_audit_entry(env):
    invoice = _issue_invoice(env)
    PaymentService(env.uow_factory).record(
        invoice_id=invoice.id, amount=Decimal("1512.50"), paid_on=PAID_ON
    )
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    actions = {entry.action.value for entry in entries}
    assert "pay" in actions
