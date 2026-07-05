from datetime import date
from decimal import Decimal

from core.services import (
    CreditNoteService,
    InvoiceService,
    PaymentService,
    ReportingService,
)

from .conftest import make_lines

JULY_4 = date(2026, 7, 4)
AUG_1 = date(2026, 8, 1)
CHECK_DATE = date(2026, 8, 15)  # after JULY_4 + 30d due date -> unpaid = overdue


def test_kpi_summary_and_revenue(env):
    invoices = InvoiceService(env.uow_factory)
    payments = PaymentService(env.uow_factory)
    credit_notes = CreditNoteService(env.uow_factory)

    paid = invoices.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=JULY_4,
    )
    payments.record(invoice_id=paid.id, amount=Decimal("1512.50"), paid_on=AUG_1)

    overdue = invoices.create(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=JULY_4,
    )

    cancelled = invoices.create(
        company_id=env.company.id, client_id=env.client2.id,
        lines=make_lines(), issue_date=AUG_1,
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
