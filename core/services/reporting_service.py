import calendar
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from uuid import UUID

from ..models import Currency, Invoice, InvoiceStatus, VATCategory
from ..repository import UnitOfWork
from ..rules import quantize, vat_buckets
from .errors import BusinessRuleError, NotFoundError

_ZERO = Decimal(0)


def _is_declarable(invoice: Invoice) -> bool:
    """Was this invoice a taxable supply in its own issue period?

    A draft never was. A bare void (`InvoiceService.void`, no credit note) is
    treated as if it never existed. An invoice voided *by a credit note* did
    happen and was declared: it stays a plus in its own period, and the credit
    note is a minus in the credit note's period — which is what the Belgian
    return wants when the correction lands in a later quarter. Same period, and
    the two cancel on their own.
    """
    if invoice.status is InvoiceStatus.DRAFT:
        return False
    if invoice.status is InvoiceStatus.VOIDED:
        return invoice.voided_by_credit_note_id is not None
    return True


@dataclass(frozen=True)
class VatReportLine:
    category: str
    rate: Decimal
    invoiced_base: Decimal
    invoiced_vat: Decimal
    credited_base: Decimal
    credited_vat: Decimal
    net_base: Decimal
    net_vat: Decimal
    grid: str | None


@dataclass(frozen=True)
class VatReport:
    """Output VAT for one declaration period.

    Preparation aid, not a filed return. It covers **sales only** — the data
    model has no purchases, so the deductible-VAT boxes (59, 81-83, 86-87) and
    the 71/72 balance cannot be produced here. `grid` is the Belgian VAT-return
    box where the mapping is unambiguous, and None where the category alone does
    not determine it (exempt, not-subject).

    Every amount is in `currency`, the company's default. Documents in any other
    currency are counted in `skipped_other_currency` and left out rather than
    summed in at face value: a VAT return is filed in one currency and there is
    no conversion anywhere in the model.
    """

    period: str
    period_start: date
    period_end: date
    currency: str = Currency.EUR.value
    lines: list[VatReportLine] = field(default_factory=list)
    invoiced_base: Decimal = _ZERO
    invoiced_vat: Decimal = _ZERO
    credited_base: Decimal = _ZERO
    credited_vat: Decimal = _ZERO
    net_base: Decimal = _ZERO
    net_vat: Decimal = _ZERO
    invoice_count: int = 0
    credit_note_count: int = 0
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class KpiSummary:
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    counts: dict[str, int]
    overdue_count: int


# Exported so the API can reject a malformed period at the edge (422) instead of
# letting it fall through to BusinessRuleError (409).
PERIOD_PATTERN = r"^\d{4}(?:-(?:Q[1-4]|0[1-9]|1[0-2]))?$"
_PERIOD_RE = re.compile(
    r"^(?P<year>\d{4})(?:-(?:Q(?P<quarter>[1-4])|(?P<month>0[1-9]|1[0-2])))?$"
)


def parse_period(period: str) -> tuple[date, date]:
    """`2026`, `2026-Q1` or `2026-03` -> inclusive [start, end].

    Belgian VAT returns are quarterly for most sole traders and monthly above the
    threshold; the bare year is there for a yearly overview, not for filing.
    """
    match = _PERIOD_RE.match(period.strip().upper())
    if match is None:
        raise BusinessRuleError(
            f"Unrecognised period '{period}' — expected YYYY, YYYY-Qn or YYYY-MM"
        )
    year = int(match["year"])
    if match["quarter"]:
        first = (int(match["quarter"]) - 1) * 3 + 1
        last = first + 2
    elif match["month"]:
        first = last = int(match["month"])
    else:
        first, last = 1, 12
    return date(year, first, 1), date(year, last, calendar.monthrange(year, last)[1])


# Belgian VAT return, output side. Grids 44/46/47 exist because a 0% line's
# category, not its rate, decides which box it belongs in.
_CATEGORY_GRIDS: dict[VATCategory, str] = {
    VATCategory.REVERSE_CHARGE: "44",
    VATCategory.INTRA_EU: "46",
    VATCategory.EXPORT: "47",
    VATCategory.ZERO: "00",
}
_STANDARD_RATE_GRIDS: dict[Decimal, str] = {
    Decimal("0"): "00",
    Decimal("6"): "01",
    Decimal("12"): "02",
    Decimal("21"): "03",
}


def _grid_for(category: VATCategory, rate: Decimal) -> str | None:
    if category is VATCategory.STANDARD:
        return _STANDARD_RATE_GRIDS.get(rate.normalize())
    return _CATEGORY_GRIDS.get(category)


def effective_status(invoice: Invoice, today: date) -> str:
    """Stored status refined with the derived 'overdue' state."""
    if invoice.status in (InvoiceStatus.VOIDED, InvoiceStatus.PAID, InvoiceStatus.DRAFT):
        return invoice.status.value
    if invoice.due_date and invoice.due_date < today:
        return InvoiceStatus.OVERDUE.value
    return invoice.status.value


class ReportingService:
    """KPIs computed in Python over repository reads. Fine at desktop/SMB scale;
    move to SQL aggregation when a SaaS tenant's invoice count makes it slow."""

    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def kpi_summary(self, company_id: UUID, today: date | None = None) -> KpiSummary:
        today = today or date.today()
        with self._uow_factory() as uow:
            invoices = uow.invoices.list(company_id=company_id)

            invoiced_total = _ZERO
            paid_total = _ZERO
            counts: dict[str, int] = {}
            overdue_count = 0

            for invoice in invoices:
                status = effective_status(invoice, today)
                counts[status] = counts.get(status, 0) + 1
                if status == InvoiceStatus.OVERDUE.value:
                    overdue_count += 1
                # Drafts have no VAT force and voided invoices are cancelled —
                # neither counts as invoiced revenue (they still show in `counts`).
                if invoice.status in (InvoiceStatus.VOIDED, InvoiceStatus.DRAFT):
                    continue
                invoiced_total += invoice.total_ttc
                paid_total += sum(
                    (p.amount for p in uow.payments.list_for_invoice(invoice.id)),
                    _ZERO,
                )

            return KpiSummary(
                invoiced_total=invoiced_total,
                paid_total=paid_total,
                outstanding_total=invoiced_total - paid_total,
                counts=counts,
                overdue_count=overdue_count,
            )

    def revenue_by_month(self, company_id: UUID, year: int) -> dict[int, Decimal]:
        with self._uow_factory() as uow:
            invoices = uow.invoices.list(company_id=company_id)
        result: dict[int, Decimal] = {}
        for invoice in invoices:
            if (
                invoice.status in (InvoiceStatus.VOIDED, InvoiceStatus.DRAFT)
                or invoice.issue_date.year != year
            ):
                continue
            month = invoice.issue_date.month
            result[month] = result.get(month, _ZERO) + invoice.total_ttc
        return result

    def vat_report(self, company_id: UUID, period: str) -> VatReport:
        """Output VAT for `period`, invoices minus credit notes, per
        (category, rate). See `VatReport` for what this deliberately does not
        cover."""
        start, end = parse_period(period)

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            currency = company.default_currency
            in_period_invoices = [
                inv
                for inv in uow.invoices.list(company_id=company_id)
                if _is_declarable(inv) and start <= inv.issue_date <= end
            ]
            in_period_notes = [
                cn
                for cn in uow.credit_notes.list(company_id=company_id)
                if start <= cn.issue_date <= end
            ]

        invoices = [inv for inv in in_period_invoices if inv.currency is currency]
        credit_notes = [cn for cn in in_period_notes if cn.currency is currency]
        skipped = (len(in_period_invoices) - len(invoices)) + (
            len(in_period_notes) - len(credit_notes)
        )

        # base, vat, credited_base, credited_vat per (category, rate)
        acc: dict[tuple[VATCategory, Decimal], list[Decimal]] = {}

        def _add(
            key: tuple[VATCategory, Decimal],
            offset: int,
            base: Decimal,
            vat: Decimal,
        ) -> None:
            slot = acc.setdefault(key, [_ZERO, _ZERO, _ZERO, _ZERO])
            slot[offset] += base
            slot[offset + 1] += vat

        for invoice in invoices:
            for bucket in vat_buckets(
                invoice.lines, invoice.invoice_discount, invoice.currency
            ):
                _add((bucket.category, bucket.rate), 0, bucket.taxable_base, bucket.vat_amount)

        for note in credit_notes:
            for bucket in vat_buckets(note.lines, None, note.currency):
                _add((bucket.category, bucket.rate), 2, bucket.taxable_base, bucket.vat_amount)

        lines: list[VatReportLine] = []
        totals = [_ZERO, _ZERO, _ZERO, _ZERO]
        for (category, rate), (inv_base, inv_vat, cn_base, cn_vat) in sorted(
            acc.items(), key=lambda item: (item[0][0].value, item[0][1])
        ):
            lines.append(
                VatReportLine(
                    category=category.value,
                    rate=rate,
                    invoiced_base=inv_base,
                    invoiced_vat=inv_vat,
                    credited_base=cn_base,
                    credited_vat=cn_vat,
                    net_base=inv_base - cn_base,
                    net_vat=inv_vat - cn_vat,
                    grid=_grid_for(category, rate),
                )
            )
            for i, value in enumerate((inv_base, inv_vat, cn_base, cn_vat)):
                totals[i] += value

        # Quantize the totals so an empty bucket reads 0.00 rather than 0 — a
        # money column that changes scale mid-table is a formatting bug waiting
        # to happen in whatever renders it.
        inv_base, inv_vat, cn_base, cn_vat = (quantize(t, currency) for t in totals)
        return VatReport(
            period=period.strip().upper(),
            period_start=start,
            period_end=end,
            currency=currency.value,
            lines=lines,
            invoiced_base=inv_base,
            invoiced_vat=inv_vat,
            credited_base=cn_base,
            credited_vat=cn_vat,
            net_base=inv_base - cn_base,
            net_vat=inv_vat - cn_vat,
            invoice_count=len(invoices),
            credit_note_count=len(credit_notes),
            skipped_other_currency=skipped,
        )
