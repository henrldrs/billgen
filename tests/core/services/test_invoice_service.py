from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from core.models import Currency, InvoiceStatus
from core.services import BusinessRuleError, InvoiceService, NotFoundError

from .conftest import ISSUE_DATE, make_lines


# ---- create_draft -----------------------------------------------------------


def test_create_draft_has_no_number_and_is_draft(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id,
        client_id=env.client.id,
        lines=make_lines(),
        issue_date=ISSUE_DATE,
    )
    assert draft.status is InvoiceStatus.DRAFT
    assert draft.reference is None
    assert draft.sequence_global is None
    # Totals are computed for display even while still a draft.
    assert draft.subtotal_ht == Decimal("1250.00")
    assert draft.total_vat == Decimal("262.50")
    assert draft.total_ttc == Decimal("1512.50")


def test_create_draft_writes_create_audit(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert [e.action.value for e in entries] == ["create"]
    assert entries[0].target_id == draft.id


def test_create_draft_unknown_client_raises(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(NotFoundError):
        service.create_draft(
            company_id=env.company.id, client_id=uuid4(), lines=make_lines(),
        )


def test_create_draft_client_of_other_company_raises(env):
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
        service.create_draft(
            company_id=env.company.id, client_id=stray_client.id, lines=make_lines(),
        )


def test_create_draft_requires_lines(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(BusinessRuleError):
        service.create_draft(
            company_id=env.company.id, client_id=env.client.id, lines=[],
        )


def test_default_draft_issue_date_is_today(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    assert draft.issue_date == date.today()


def test_draft_lines_are_renumbered(env):
    lines = make_lines() + [
        make_lines()[0].model_copy(update={"description": "Second", "line_number": 99})
    ]
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=lines,
    )
    assert [line.line_number for line in draft.lines] == [1, 2]


# ---- issue ------------------------------------------------------------------


def test_issue_assigns_number_freezes_and_audits(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    issued = service.issue(draft.id)

    assert issued.status is InvoiceStatus.ISSUED
    assert issued.reference == "ACME-BC07012026"
    assert issued.sequence_global == 1
    assert issued.subtotal_ht == Decimal("1250.00")
    assert issued.total_ttc == Decimal("1512.50")
    assert issued.due_date == ISSUE_DATE + timedelta(days=30)

    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    actions = [e.action.value for e in entries]
    assert "create" in actions and "issue" in actions
    issue_entry = next(e for e in entries if e.action.value == "issue")
    assert issue_entry.after["reference"] == "ACME-BC07012026"


def test_issue_is_idempotent_guard(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    service.issue(draft.id)
    with pytest.raises(BusinessRuleError):
        service.issue(draft.id)  # already ISSUED


def test_issue_unknown_invoice_raises(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(NotFoundError):
        service.issue(uuid4())


def test_number_is_consumed_only_at_issue(env):
    service = InvoiceService(env.uow_factory)
    # Two drafts, neither burns a number.
    service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    draft2 = service.create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    # Only the issued one gets sequence 1 — drafts didn't advance the sequence.
    issued = service.issue(draft2.id)
    assert issued.sequence_global == 1


def test_sequences_advance_per_bucket_and_globally(env):
    service = InvoiceService(env.uow_factory)

    def issue(client_id):
        draft = service.create_draft(
            company_id=env.company.id, client_id=client_id,
            lines=make_lines(), issue_date=ISSUE_DATE,
        )
        return service.issue(draft.id)

    first = issue(env.client.id)
    second = issue(env.client.id)
    other_client = issue(env.client2.id)

    assert first.reference == "ACME-BC07012026"
    assert second.reference == "ACME-BC07022026"        # bucket seq 2
    assert other_client.reference == "ACME-ZW07012026"  # new bucket restarts at 1
    assert (first.sequence_global, second.sequence_global, other_client.sequence_global) == (
        1, 2, 3,
    )


# ---- delete_draft -----------------------------------------------------------


def test_delete_draft_removes_it_and_audits(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    service.delete_draft(draft.id)

    with pytest.raises(NotFoundError):
        service.get(draft.id)
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert "delete" in [e.action.value for e in entries]


def test_delete_issued_invoice_is_refused(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    issued = service.issue(draft.id)
    with pytest.raises(BusinessRuleError):
        service.delete_draft(issued.id)
    # Still there, untouched.
    assert service.get(issued.id).status is InvoiceStatus.ISSUED


def test_delete_unknown_invoice_raises(env):
    service = InvoiceService(env.uow_factory)
    with pytest.raises(NotFoundError):
        service.delete_draft(uuid4())


# ---- void / preview ---------------------------------------------------------


def test_void_and_double_void(env):
    service = InvoiceService(env.uow_factory)
    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id, lines=make_lines(),
    )
    issued = service.issue(draft.id)
    voided = service.void(issued.id, "duplicate entry")
    assert voided.status is InvoiceStatus.VOIDED
    assert voided.voided_reason == "duplicate entry"
    with pytest.raises(BusinessRuleError):
        service.void(issued.id, "again")


def test_preview_consumes_no_sequence(env):
    service = InvoiceService(env.uow_factory)
    totals = service.preview(make_lines(), None, Currency.EUR)
    assert totals.total_ttc == Decimal("1512.50")

    draft = service.create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    issued = service.issue(draft.id)
    assert issued.sequence_global == 1  # preview did not burn a number
