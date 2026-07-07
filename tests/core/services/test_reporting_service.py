from datetime import date
from decimal import Decimal

from core.services import (
    CreditNoteService,
    InvoiceService,
    PaymentService,
    ReportingService,
)

from .conftest import issue_invoice, make_lines

JULY_4 = date(2026, 7, 4)
AUG_1 = date(2026, 8, 1)
CHECK_DATE = date(2026, 8, 15)  # after JULY_4 + 30d due date -> unpaid = overdue


def test_kpi_summary_and_revenue(env):
    payments = PaymentService(env.uow_factory)
    credit_notes = CreditNoteService(env.uow_factory)

    paid = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )
    payments.record(invoice_id=paid.id, amount=Decimal("1512.50"), paid_on=AUG_1)

    overdue = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )

    cancelled = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client2.id,
        issue_date=AUG_1,
    )
    credit_notes.issue(invoice_id=cancelled.id, reason="cancelled", issue_date=AUG_1)

    reporting = ReportingService(env.uow_factory)
    kpi = reporting.kpi_summary(env.company.id, today=CHECK_DATE)

    assert kpi.invoiced_total == Decimal("3025.00")  # 2 non-voided x 1512.50
    assert kpi.paid_total == Decimal("1512.50")
    assert kpi.outstanding_total == Decimal("1512.50")
    assert kpi.counts["paid"] == 1
    assert kpi.counts["overdue"] == 1
    assert kpi.counts["voided"] == 1
    assert kpi.overdue_count == 1
    assert overdue.due_date < CHECK_DATE

    revenue = reporting.revenue_by_month(env.company.id, 2026)
    assert revenue[7] == Decimal("3025.00")  # both July invoices are non-voided
    assert 8 not in revenue  # August invoice was voided


def test_drafts_are_excluded_from_totals_and_revenue(env):
    # An issued July invoice counts; a draft in the same month must not.
    issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )
    InvoiceService(env.uow_factory).create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=JULY_4,
    )

    reporting = ReportingService(env.uow_factory)
    kpi = reporting.kpi_summary(env.company.id, today=CHECK_DATE)

    assert kpi.invoiced_total == Decimal("1512.50")  # only the issued invoice
    assert kpi.counts["draft"] == 1  # the draft is still surfaced as a count
    assert reporting.revenue_by_month(env.company.id, 2026)[7] == Decimal("1512.50")
