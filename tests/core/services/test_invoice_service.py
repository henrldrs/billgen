from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from core.models import Currency, InvoiceStatus
from core.services import BusinessRuleError, InvoiceService, NotFoundError

from .conftest import ISSUE_DATE, make_lines


def test_create_issues_invoice_with_reference_and_totals(env):
    service = InvoiceService(env.uow_factory)
    invoice = service.create(
        company_id=env.company.id,
        client_id=env.client.id,
        lines=make_lines(),
        issue_date=ISSUE_DATE,
    )
    assert invoice.reference == "ACME-BC07012026"
    assert invoice.sequence_global == 1
    assert invoice.status is InvoiceStatus.ISSUED
    assert invoice.subtotal_ht == Decimal("1250.00")
    assert invoice.total_vat == Decimal("262.50")
    assert invoice.total_ttc == Decimal("1512.50")
    assert invoice.due_date == ISSUE_DATE + timedelta(days=30)
    assert invoice.pdf_template == "fr_standard"


def test_sequences_advance_per_bucket_and_globally(env):
    service = InvoiceService(env.uow_factory)
    first = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    second = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    other_client = service.create(
        company_id=env.company.id, client_id=env.client2.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    assert first.reference == "ACME-BC07012026"
    assert second.reference == "ACME-BC07022026"       # bucket seq 2
    assert other_client.reference == "ACME-ZW07012026"  # new bucket restarts at 1
    assert (first.sequence_global, second.sequence_global, other_client.sequence_global) == (
        1, 2, 3,
    )


def test_create_writes_audit_entry(env):
    service = InvoiceService(env.uow_factory)
    invoice = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert len(entries) == 1
    assert entries[0].target_id == invoice.id
    assert entries[0].after["reference"] == invoice.reference


def test_create_unknown_client_raises(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(NotFoundError):
        service.create(
            company_id=env.company.id, client_id=uuid4(),
            lines=make_lines(), issue_date=ISSUE_DATE,
        )


def test_create_client_of_other_company_raises(env):
    from core.models import Client, Company

    other_company = Company(organization_id=env.org.id, name="Second Co")
    stray_client = Client(
        organization_id=env.org.id, company_id=other_company.id, name="Stray"
    )
    with env.uow_factory() as uow:
        uow.companies.add(other_company)
        uow.clients.add(stray_client)
        uow.commit()

    service = InvoiceService(env.uow_factory)
    with pytest.raises(BusinessRuleError):
        service.create(
            company_id=env.company.id, client_id=stray_client.id,
            lines=make_lines(), issue_date=ISSUE_DATE,
        )


def test_create_requires_lines(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(BusinessRuleError):
        service.create(
            company_id=env.company.id, client_id=env.client.id,
            lines=[], issue_date=ISSUE_DATE,
        )


def test_void_and_double_void(env):
    service = InvoiceService(env.uow_factory)
    invoice = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    voided = service.void(invoice.id, "duplicate entry")
    assert voided.status is InvoiceStatus.VOIDED
    assert voided.voided_reason == "duplicate entry"
    with pytest.raises(BusinessRuleError):
        service.void(invoice.id, "again")


def test_preview_consumes_no_sequence(env):
    service = InvoiceService(env.uow_factory)
    totals = service.preview(make_lines(), None, Currency.EUR)
    assert totals.total_ttc == Decimal("1512.50")

    invoice = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    assert invoice.sequence_global == 1  # preview did not burn a number


def test_lines_are_renumbered(env):
    lines = make_lines() + [
        make_lines()[0].model_copy(update={"description": "Second", "line_number": 99})
    ]
    service = InvoiceService(env.uow_factory)
    invoice = service.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=lines, issue_date=ISSUE_DATE,
    )
    assert [line.line_number for line in invoice.lines] == [1, 2]


def test_default_issue_date_is_today(env):
    service = InvoiceService(env.uow_factory)
    invoice = service.create(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    assert invoice.issue_date == date.today()
