"""Sprint 2 — the VAT report. Output VAT per (category, rate), invoices minus
credit notes, for a year / quarter / month period."""

from datetime import date
from decimal import Decimal

import pytest

from core.models import Currency, InvoiceLine, VATCategory, VATRate
from core.services import BusinessRuleError, CreditNoteService, InvoiceService, ReportingService
from core.services.reporting_service import parse_period

from .conftest import issue_invoice, make_lines

JULY_4 = date(2026, 7, 4)
OCT_2 = date(2026, 10, 2)


def _line(rate: str, category: VATCategory = VATCategory.STANDARD, price: str = "100.00"):
    return InvoiceLine(
        line_number=1,
        description="Service",
        quantity=Decimal("1"),
        unit_price=Decimal(price),
        vat=VATRate(category=category, rate=Decimal(rate)),
    )


@pytest.mark.parametrize(
    ("period", "expected"),
    [
        ("2026", (date(2026, 1, 1), date(2026, 12, 31))),
        ("2026-Q3", (date(2026, 7, 1), date(2026, 9, 30))),
        ("2026-07", (date(2026, 7, 1), date(2026, 7, 31))),
        ("2024-02", (date(2024, 2, 1), date(2024, 2, 29))),  # leap year
    ],
)
def test_parse_period(period, expected):
    assert parse_period(period) == expected


@pytest.mark.parametrize("period", ["", "26-Q1", "2026-Q5", "2026-13", "2026-00", "later"])
def test_parse_period_rejects_garbage(period):
    with pytest.raises(BusinessRuleError):
        parse_period(period)


def test_standard_rate_lands_in_grid_03(env):
    issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )  # 1250.00 HT @ 21% -> 262.50

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.period_start == date(2026, 7, 1)
    assert report.period_end == date(2026, 9, 30)
    assert report.invoice_count == 1
    assert len(report.lines) == 1
    line = report.lines[0]
    assert line.category == "S"
    assert line.rate == Decimal("21")
    assert line.grid == "03"
    assert line.net_base == Decimal("1250.00")
    assert line.net_vat == Decimal("262.50")
    assert report.net_vat == Decimal("262.50")


def test_rates_split_into_their_own_grids(env):
    for rate, price in (("6", "100.00"), ("12", "200.00"), ("21", "300.00")):
        issue_invoice(
            env.uow_factory, company_id=env.company.id, client_id=env.client.id,
            issue_date=JULY_4, lines=[_line(rate, price=price)],
        )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    by_grid = {line.grid: line for line in report.lines}
    assert by_grid["01"].net_vat == Decimal("6.00")
    assert by_grid["02"].net_vat == Decimal("24.00")
    assert by_grid["03"].net_vat == Decimal("63.00")
    assert report.net_base == Decimal("600.00")
    assert report.net_vat == Decimal("93.00")


def test_category_not_rate_decides_the_grid_for_zero_rated_lines(env):
    """Reverse charge and export are both 0% — only the category separates them."""
    for category in (VATCategory.REVERSE_CHARGE, VATCategory.EXPORT, VATCategory.INTRA_EU):
        issue_invoice(
            env.uow_factory, company_id=env.company.id, client_id=env.client.id,
            issue_date=JULY_4, lines=[_line("0", category)],
        )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    grids = {line.category: line.grid for line in report.lines}
    assert grids == {"AE": "44", "G": "47", "K": "46"}
    assert report.net_vat == Decimal("0")
    assert report.net_base == Decimal("300.00")


def test_exempt_lines_carry_no_grid(env):
    issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4, lines=[_line("0", VATCategory.EXEMPT)],
    )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert [line.grid for line in report.lines] == [None]


def test_a_credit_note_in_the_same_period_cancels_its_invoice(env):
    invoice = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )
    CreditNoteService(env.uow_factory).issue(
        invoice_id=invoice.id, reason="cancelled", issue_date=JULY_4
    )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.invoiced_vat == Decimal("262.50")
    assert report.credited_vat == Decimal("262.50")
    assert report.net_vat == Decimal("0.00")
    assert report.net_base == Decimal("0.00")


def test_a_credit_note_in_a_later_period_corrects_that_period(env):
    """Q3 was already declared; the correction belongs to Q4, not retroactively
    to Q3."""
    invoice = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )
    CreditNoteService(env.uow_factory).issue(
        invoice_id=invoice.id, reason="cancelled", issue_date=OCT_2
    )

    reporting = ReportingService(env.uow_factory)
    q3 = reporting.vat_report(env.company.id, "2026-Q3")
    q4 = reporting.vat_report(env.company.id, "2026-Q4")

    assert q3.net_vat == Decimal("262.50")
    assert q3.credit_note_count == 0
    assert q4.net_vat == Decimal("-262.50")
    assert q4.invoice_count == 0
    assert q4.credit_note_count == 1
    # Over the full year the two net out.
    assert reporting.vat_report(env.company.id, "2026").net_vat == Decimal("0.00")


def test_drafts_and_bare_voids_are_not_declared(env):
    invoices = InvoiceService(env.uow_factory)
    invoices.create_draft(
        company_id=env.company.id, client_id=env.client.id,
        lines=make_lines(), issue_date=JULY_4,
    )
    voided = issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4,
    )
    invoices.void(voided.id, reason="issued in error")

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.lines == []
    assert report.invoice_count == 0
    assert report.net_vat == Decimal("0")


def test_period_bounds_are_inclusive(env):
    for issue_date in (date(2026, 6, 30), date(2026, 7, 1), date(2026, 9, 30), date(2026, 10, 1)):
        issue_invoice(
            env.uow_factory, company_id=env.company.id, client_id=env.client.id,
            issue_date=issue_date, lines=[_line("21")],
        )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.invoice_count == 2  # Jul 1 and Sep 30, not Jun 30 or Oct 1


def test_totals_are_quantized_even_when_empty(env):
    """A money column that changes scale mid-table breaks whatever renders it."""
    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.currency == "EUR"
    assert str(report.net_vat) == "0.00"
    assert str(report.credited_base) == "0.00"


def test_documents_in_another_currency_are_excluded_not_summed(env):
    """There is no conversion anywhere in the model, so adding a USD base to a
    EUR one would produce a number that means nothing."""
    issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4, lines=[_line("21", price="100.00")],
    )
    issue_invoice(
        env.uow_factory, company_id=env.company.id, client_id=env.client.id,
        issue_date=JULY_4, lines=[_line("21", price="100.00")], currency=Currency.USD,
    )

    report = ReportingService(env.uow_factory).vat_report(env.company.id, "2026-Q3")

    assert report.currency == "EUR"
    assert report.invoice_count == 1
    assert report.skipped_other_currency == 1
    assert report.net_base == Decimal("100.00")
