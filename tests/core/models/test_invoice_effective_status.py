"""`Invoice.effective_status` — the calendar's refinement of a stored status.

Pinned on the model because four readers depend on the same rule: the
reports, the KPIs, the alerts and, since T-51, the list filter. A change here
that any one of them did not expect would show up as four disagreeing screens.
"""

from datetime import date
from uuid import uuid4

from core.models import Invoice, InvoiceStatus


def _invoice(status: InvoiceStatus, due: date | None) -> Invoice:
    return Invoice(
        organization_id=uuid4(),
        company_id=uuid4(),
        client_id=uuid4(),
        issue_date=date(2026, 7, 4),
        due_date=due,
        status=status,
    )


def test_an_open_invoice_goes_overdue_the_day_after_it_falls_due():
    issued = _invoice(InvoiceStatus.ISSUED, date(2026, 8, 3))
    assert issued.effective_status(date(2026, 8, 2)) == "issued"
    assert issued.effective_status(date(2026, 8, 3)) == "issued"
    assert issued.effective_status(date(2026, 8, 4)) == "overdue"

    part_paid = _invoice(InvoiceStatus.PARTIALLY_PAID, date(2026, 8, 3))
    assert part_paid.effective_status(date(2026, 8, 3)) == "partially_paid"
    assert part_paid.effective_status(date(2026, 8, 4)) == "overdue"


def test_closed_and_unissued_invoices_never_read_overdue():
    for status in (InvoiceStatus.DRAFT, InvoiceStatus.PAID, InvoiceStatus.VOIDED):
        stale = _invoice(status, date(2026, 1, 1))
        assert stale.effective_status(date(2026, 9, 16)) == status.value


def test_an_undated_invoice_cannot_be_late():
    assert _invoice(InvoiceStatus.ISSUED, None).effective_status(date(2099, 1, 1)) == "issued"
