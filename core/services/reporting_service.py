import calendar
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from uuid import UUID

from ..models import Currency, Invoice, InvoiceStatus, VATCategory
from ..repository import UnitOfWork
from ..rules import line_totals, quantize, vat_buckets
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
class StatusBucket:
    status: str
    count: int
    total_ttc: Decimal


@dataclass(frozen=True)
class InvoiceReport:
    """Invoice counts and money per effective status, for one company.

    The Invoices report used to be aggregated in the browser from the full list,
    which meant every filter change re-downloaded every invoice. `status` here is
    the *effective* status (see `effective_status`), so Overdue is a bucket rather
    than something the caller has to derive from due dates a second time.

    Amounts are in the company's default currency; invoices in any other currency
    are counted in `skipped_other_currency` rather than summed at face value.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    statuses: list[StatusBucket] = field(default_factory=list)
    by_month: dict[str, Decimal] = field(default_factory=dict)
    count_by_month: dict[str, int] = field(default_factory=dict)
    invoice_count: int = 0
    invoiced_total: Decimal = _ZERO
    paid_total: Decimal = _ZERO
    outstanding_total: Decimal = _ZERO
    draft_count: int = 0
    overdue_count: int = 0
    overdue_total: Decimal = _ZERO
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class MethodBucket:
    method: str
    count: int
    total: Decimal


@dataclass(frozen=True)
class PaymentReport:
    """What came in, over a period, split by how it arrived.

    The payments screen shipped printing no total on purpose: summing a page of
    rows in the browser gives the total of *that page*, which is a different
    number from the total of the filter, and the wrong one. This is the total of
    the filter.

    Cash in, not revenue: a payment is counted on the day it landed, whatever
    period the invoice it settles belongs to. The two disagree across a quarter
    boundary and both are right — this one answers "what did the bank see".

    Amounts are in the company's default currency; payments in any other are
    counted in `skipped_other_currency` rather than summed at face value.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    methods: list[MethodBucket] = field(default_factory=list)
    by_month: dict[str, Decimal] = field(default_factory=dict)
    count_by_month: dict[str, int] = field(default_factory=dict)
    payment_count: int = 0
    total: Decimal = _ZERO
    largest: Decimal = _ZERO
    first_payment_on: date | None = None
    last_payment_on: date | None = None
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class ClientRow:
    client_id: UUID
    name: str
    invoice_count: int
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    overdue_count: int
    overdue_total: Decimal
    last_invoice_date: date | None


@dataclass(frozen=True)
class ClientReport:
    """Who your revenue comes from, and who owes you.

    `ClientStats` answers this for one client, and a screen wanting the table
    would otherwise call it once per client — the N+1 that report exists to
    avoid, moved up a level.

    Clients with no invoices in the period are left out rather than listed as
    zeroes: a customer list is a different question from a revenue report, and
    `GET /clients` already answers it.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    clients: list[ClientRow] = field(default_factory=list)
    client_count: int = 0
    invoiced_total: Decimal = _ZERO
    paid_total: Decimal = _ZERO
    outstanding_total: Decimal = _ZERO
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class ProductRow:
    product_id: UUID | None
    name: str
    invoice_count: int
    quantity: Decimal
    net_ht: Decimal


@dataclass(frozen=True)
class ProductReport:
    """What you actually sell, counted by line rather than by document.

    Amounts are line net HT — quantity x price, less the line's own discount.
    An invoice-level discount is *not* allocated down: it belongs to the deal,
    not to any one product, and splitting it here would make the same product
    read as cheaper on invoices that happened to carry one. So this is a
    volume-and-mix report, and it will legitimately sum higher than the net
    revenue in `/reports/invoices` wherever document discounts were given.

    Lines with no `product_id` are real sales — free text is how most invoices
    are actually written — so they are kept, grouped under one row with
    `product_id: null` rather than dropped.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    products: list[ProductRow] = field(default_factory=list)
    line_count: int = 0
    net_ht: Decimal = _ZERO
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class ClientStats:
    """The numbers behind Client 360's header.

    Derivable from `GET /invoices?client_id` plus a payments fetch per invoice,
    which is exactly the N+1 the screen should not be doing.

    `average_days_to_payment` is measured from issue date to the date of the
    payment that settled the invoice, over fully-paid invoices only — a partially
    paid invoice has no settlement date yet, and averaging it in would report a
    number that improves when a customer pays *less*.
    """

    client_id: UUID
    company_id: UUID
    currency: str
    invoice_count: int = 0
    draft_count: int = 0
    invoiced_total: Decimal = _ZERO
    paid_total: Decimal = _ZERO
    outstanding_total: Decimal = _ZERO
    credited_total: Decimal = _ZERO
    credit_note_count: int = 0
    overdue_count: int = 0
    overdue_total: Decimal = _ZERO
    first_invoice_date: date | None = None
    last_invoice_date: date | None = None
    average_days_to_payment: int | None = None
    skipped_other_currency: int = 0


@dataclass(frozen=True)
class TimelineEvent:
    """One commercial event on a client's history.

    Deliberately *not* the audit log. Audit entries are written against the
    invoice and carry no client id, so `GET /activity?target_id=<client>` can
    never return an invoice, a payment or a credit note — it returns edits to the
    client record. This is the other timeline: what was sold, credited and paid.
    """

    at: date
    kind: str
    amount: Decimal
    currency: str
    invoice_id: UUID | None = None
    credit_note_id: UUID | None = None
    payment_id: UUID | None = None
    reference: str | None = None
    detail: str | None = None


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


# Same-day tie-break for the client timeline: an invoice sorts above the payment
# that settles it, and a void sorts last.
_TIMELINE_ORDER: dict[str, int] = {
    "invoice_drafted": 0,
    "invoice_issued": 0,
    "credit_note_issued": 1,
    "payment_received": 2,
    "invoice_voided": 3,
}


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

    def invoice_report(
        self,
        company_id: UUID,
        period: str | None = None,
        today: date | None = None,
    ) -> InvoiceReport:
        """Invoice counts and totals per effective status for `company_id`,
        optionally restricted to a period (`YYYY`, `YYYY-Qn`, `YYYY-MM`).

        Money follows the same rule as everywhere else in this service: drafts
        and voided invoices are counted but never summed into revenue.
        """
        today = today or date.today()
        start, end = parse_period(period) if period else (None, None)

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            currency = company.default_currency
            invoices = [
                inv
                for inv in uow.invoices.list(company_id=company_id)
                if start is None or start <= inv.issue_date <= end
            ]
            paid_by_invoice = {
                inv.id: sum((p.amount for p in uow.payments.list_for_invoice(inv.id)), _ZERO)
                for inv in invoices
            }

        in_currency = [inv for inv in invoices if inv.currency is currency]
        skipped = len(invoices) - len(in_currency)

        buckets: dict[str, list] = {}
        by_month: dict[str, Decimal] = {}
        count_by_month: dict[str, int] = {}
        invoiced_total = paid_total = overdue_total = _ZERO
        draft_count = overdue_count = 0

        for invoice in in_currency:
            status = effective_status(invoice, today)
            slot = buckets.setdefault(status, [0, _ZERO])
            slot[0] += 1
            if invoice.status is InvoiceStatus.DRAFT:
                draft_count += 1
                continue
            slot[1] += invoice.total_ttc
            if invoice.status is InvoiceStatus.VOIDED:
                continue

            invoiced_total += invoice.total_ttc
            paid_total += paid_by_invoice[invoice.id]
            if status == InvoiceStatus.OVERDUE.value:
                overdue_count += 1
                overdue_total += invoice.total_ttc - paid_by_invoice[invoice.id]

            month = f"{invoice.issue_date.year:04d}-{invoice.issue_date.month:02d}"
            by_month[month] = by_month.get(month, _ZERO) + invoice.total_ttc
            count_by_month[month] = count_by_month.get(month, 0) + 1

        return InvoiceReport(
            company_id=company_id,
            period=period.strip().upper() if period else None,
            period_start=start,
            period_end=end,
            currency=currency.value,
            statuses=[
                StatusBucket(status=status, count=count, total_ttc=quantize(total, currency))
                for status, (count, total) in sorted(buckets.items())
            ],
            by_month=dict(sorted(by_month.items())),
            count_by_month=dict(sorted(count_by_month.items())),
            invoice_count=len(in_currency),
            invoiced_total=quantize(invoiced_total, currency),
            paid_total=quantize(paid_total, currency),
            outstanding_total=quantize(invoiced_total - paid_total, currency),
            draft_count=draft_count,
            overdue_count=overdue_count,
            overdue_total=quantize(overdue_total, currency),
            skipped_other_currency=skipped,
        )

    def payment_report(
        self,
        company_id: UUID,
        period: str | None = None,
        client_id: UUID | None = None,
        paid_from: date | None = None,
        paid_to: date | None = None,
    ) -> PaymentReport:
        """Payments received by `company_id`, over a period or an explicit window.

        The filter is on `paid_on` — when the money arrived — not on the issue
        date of the invoice it settles. That is the question a payments report
        is asked: reconciling a bank statement, or answering "how much came in
        last quarter".

        `period` is a shorthand for a window that happens to be a named one;
        `paid_from`/`paid_to` is the general case, and the same pair
        `payments.list` already takes, so a screen that filters its rows by a
        window can ask for the total of exactly those rows. Passing both is a
        caller bug rather than a precedence question — a period that disagreed
        with the dates beside it would have to silently win — so it raises.
        """
        if period is not None and (paid_from is not None or paid_to is not None):
            raise ValueError(
                "pass either period or paid_from/paid_to, not both — "
                "a period IS a window, and two of them cannot both be the filter"
            )

        if period is not None:
            start, end = parse_period(period)
        else:
            start, end = paid_from, paid_to

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            currency = company.default_currency
            payments = uow.payments.list(
                company_id=company_id,
                client_id=client_id,
                paid_from=start,
                paid_to=end,
            )

        in_currency = [p for p in payments if p.currency is currency]
        skipped = len(payments) - len(in_currency)

        methods: dict[str, list] = {}
        by_month: dict[str, Decimal] = {}
        count_by_month: dict[str, int] = {}
        total = largest = _ZERO

        for payment in in_currency:
            slot = methods.setdefault(payment.method.value, [0, _ZERO])
            slot[0] += 1
            slot[1] += payment.amount

            total += payment.amount
            largest = max(largest, payment.amount)

            month = f"{payment.paid_on.year:04d}-{payment.paid_on.month:02d}"
            by_month[month] = by_month.get(month, _ZERO) + payment.amount
            count_by_month[month] = count_by_month.get(month, 0) + 1

        dates = sorted(p.paid_on for p in in_currency)
        return PaymentReport(
            company_id=company_id,
            period=period.strip().upper() if period else None,
            period_start=start,
            period_end=end,
            currency=currency.value,
            methods=[
                MethodBucket(
                    method=method, count=count, total=quantize(amount, currency)
                )
                for method, (count, amount) in sorted(methods.items())
            ],
            by_month={
                month: quantize(amount, currency)
                for month, amount in sorted(by_month.items())
            },
            count_by_month=dict(sorted(count_by_month.items())),
            payment_count=len(in_currency),
            total=quantize(total, currency),
            largest=quantize(largest, currency),
            first_payment_on=dates[0] if dates else None,
            last_payment_on=dates[-1] if dates else None,
            skipped_other_currency=skipped,
        )

    def client_report(
        self,
        company_id: UUID,
        period: str | None = None,
        today: date | None = None,
    ) -> ClientReport:
        """Revenue and debt per client, biggest first.

        Drafts are counted nowhere — a draft is not a sale — and voided
        invoices are excluded for the same reason they are excluded from every
        other money figure in this service.
        """
        today = today or date.today()
        start, end = parse_period(period) if period else (None, None)

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            currency = company.default_currency
            names = {c.id: c.name for c in uow.clients.list(company_id=company_id)}
            invoices = [
                inv
                for inv in uow.invoices.list(company_id=company_id)
                if start is None or start <= inv.issue_date <= end
            ]
            paid_by_invoice = {
                inv.id: sum((p.amount for p in uow.payments.list_for_invoice(inv.id)), _ZERO)
                for inv in invoices
            }

        in_currency = [inv for inv in invoices if inv.currency is currency]
        skipped = len(invoices) - len(in_currency)

        acc: dict[UUID, dict] = {}
        for invoice in in_currency:
            if invoice.status in (InvoiceStatus.DRAFT, InvoiceStatus.VOIDED):
                continue
            row = acc.setdefault(
                invoice.client_id,
                {
                    "count": 0,
                    "invoiced": _ZERO,
                    "paid": _ZERO,
                    "overdue_count": 0,
                    "overdue": _ZERO,
                    "last": None,
                },
            )
            paid = paid_by_invoice[invoice.id]
            row["count"] += 1
            row["invoiced"] += invoice.total_ttc
            row["paid"] += paid
            if effective_status(invoice, today) == InvoiceStatus.OVERDUE.value:
                row["overdue_count"] += 1
                row["overdue"] += invoice.total_ttc - paid
            if row["last"] is None or invoice.issue_date > row["last"]:
                row["last"] = invoice.issue_date

        rows = [
            ClientRow(
                client_id=client_id,
                name=names.get(client_id, "(deleted client)"),
                invoice_count=data["count"],
                invoiced_total=quantize(data["invoiced"], currency),
                paid_total=quantize(data["paid"], currency),
                outstanding_total=quantize(data["invoiced"] - data["paid"], currency),
                overdue_count=data["overdue_count"],
                overdue_total=quantize(data["overdue"], currency),
                last_invoice_date=data["last"],
            )
            for client_id, data in acc.items()
        ]
        # Biggest first, then by name so the order is stable when two clients
        # have billed the same amount — a table that reshuffles on refresh is
        # unreadable.
        rows.sort(key=lambda r: (-r.invoiced_total, r.name))

        return ClientReport(
            company_id=company_id,
            period=period.strip().upper() if period else None,
            period_start=start,
            period_end=end,
            currency=currency.value,
            clients=rows,
            client_count=len(rows),
            invoiced_total=quantize(sum((r.invoiced_total for r in rows), _ZERO), currency),
            paid_total=quantize(sum((r.paid_total for r in rows), _ZERO), currency),
            outstanding_total=quantize(
                sum((r.outstanding_total for r in rows), _ZERO), currency
            ),
            skipped_other_currency=skipped,
        )

    def product_report(
        self,
        company_id: UUID,
        period: str | None = None,
    ) -> ProductReport:
        """What sold, by invoice line. See `ProductReport` for what the amounts
        are and, more importantly, what they are not."""
        start, end = parse_period(period) if period else (None, None)

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            currency = company.default_currency
            names = {p.id: p.name for p in uow.products.list(company_id=company_id)}
            invoices = [
                inv
                for inv in uow.invoices.list(company_id=company_id)
                if start is None or start <= inv.issue_date <= end
            ]

        in_currency = [inv for inv in invoices if inv.currency is currency]
        skipped = len(invoices) - len(in_currency)

        acc: dict[UUID | None, dict] = {}
        line_count = 0
        for invoice in in_currency:
            if invoice.status in (InvoiceStatus.DRAFT, InvoiceStatus.VOIDED):
                continue
            for line in invoice.lines:
                row = acc.setdefault(
                    line.product_id,
                    {"invoices": set(), "quantity": _ZERO, "net": _ZERO},
                )
                row["invoices"].add(invoice.id)
                row["quantity"] += line.quantity
                row["net"] += line_totals(line, currency).net_ht
                line_count += 1

        rows = [
            ProductRow(
                product_id=product_id,
                # A catalogue entry can be renamed or deleted after it was
                # billed; the invoice line is the record, so an id nothing
                # matches is labelled rather than dropped.
                name=(
                    "(free-text lines)"
                    if product_id is None
                    else names.get(product_id, "(deleted product)")
                ),
                invoice_count=len(data["invoices"]),
                quantity=data["quantity"],
                net_ht=quantize(data["net"], currency),
            )
            for product_id, data in acc.items()
        ]
        rows.sort(key=lambda r: (-r.net_ht, r.name))

        return ProductReport(
            company_id=company_id,
            period=period.strip().upper() if period else None,
            period_start=start,
            period_end=end,
            currency=currency.value,
            products=rows,
            line_count=line_count,
            net_ht=quantize(sum((r.net_ht for r in rows), _ZERO), currency),
            skipped_other_currency=skipped,
        )

    def client_stats(self, client_id: UUID, today: date | None = None) -> ClientStats:
        """Client 360's header numbers, computed server-side in one pass."""
        today = today or date.today()
        with self._uow_factory() as uow:
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            company = uow.companies.get(client.company_id)
            if company is None:
                raise NotFoundError(f"Company {client.company_id} not found")
            currency = company.default_currency
            invoices = uow.invoices.list(company_id=client.company_id, client_id=client_id)
            payments_by_invoice = {
                inv.id: uow.payments.list_for_invoice(inv.id) for inv in invoices
            }
            credit_notes = [
                cn
                for cn in uow.credit_notes.list(company_id=client.company_id)
                if cn.client_id == client_id
            ]

        in_currency = [inv for inv in invoices if inv.currency is currency]
        notes_in_currency = [cn for cn in credit_notes if cn.currency is currency]
        skipped = (len(invoices) - len(in_currency)) + (
            len(credit_notes) - len(notes_in_currency)
        )

        invoiced_total = paid_total = overdue_total = _ZERO
        draft_count = overdue_count = 0
        issue_dates: list[date] = []
        settlement_days: list[int] = []

        for invoice in in_currency:
            if invoice.status is InvoiceStatus.DRAFT:
                draft_count += 1
                continue
            issue_dates.append(invoice.issue_date)
            if invoice.status is InvoiceStatus.VOIDED:
                continue

            payments = payments_by_invoice[invoice.id]
            paid = sum((p.amount for p in payments), _ZERO)
            invoiced_total += invoice.total_ttc
            paid_total += paid
            if effective_status(invoice, today) == InvoiceStatus.OVERDUE.value:
                overdue_count += 1
                overdue_total += invoice.total_ttc - paid
            if invoice.status is InvoiceStatus.PAID and payments:
                settled_on = max(p.paid_on for p in payments)
                settlement_days.append((settled_on - invoice.issue_date).days)

        return ClientStats(
            client_id=client_id,
            company_id=client.company_id,
            currency=currency.value,
            invoice_count=len(in_currency),
            draft_count=draft_count,
            invoiced_total=quantize(invoiced_total, currency),
            paid_total=quantize(paid_total, currency),
            outstanding_total=quantize(invoiced_total - paid_total, currency),
            credited_total=quantize(
                sum((cn.total_ttc for cn in notes_in_currency), _ZERO), currency
            ),
            credit_note_count=len(notes_in_currency),
            overdue_count=overdue_count,
            overdue_total=quantize(overdue_total, currency),
            first_invoice_date=min(issue_dates) if issue_dates else None,
            last_invoice_date=max(issue_dates) if issue_dates else None,
            average_days_to_payment=(
                round(sum(settlement_days) / len(settlement_days)) if settlement_days else None
            ),
            skipped_other_currency=skipped,
        )

    def client_timeline(self, client_id: UUID, limit: int = 100) -> list[TimelineEvent]:
        """What was sold, credited and paid for one client - newest first.

        Drafts are included (as `invoice_drafted`) because a draft is a real
        commercial intent the salesperson is looking for; it is labelled
        distinctly so it can never be mistaken for a supply.
        """
        with self._uow_factory() as uow:
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            invoices = uow.invoices.list(company_id=client.company_id, client_id=client_id)
            payments_by_invoice = {
                inv.id: uow.payments.list_for_invoice(inv.id) for inv in invoices
            }
            credit_notes = [
                cn
                for cn in uow.credit_notes.list(company_id=client.company_id)
                if cn.client_id == client_id
            ]

        references = {inv.id: inv.reference for inv in invoices}
        events: list[TimelineEvent] = []

        for invoice in invoices:
            drafted = invoice.status is InvoiceStatus.DRAFT
            events.append(
                TimelineEvent(
                    at=invoice.issue_date,
                    kind="invoice_drafted" if drafted else "invoice_issued",
                    amount=invoice.total_ttc,
                    currency=invoice.currency.value,
                    invoice_id=invoice.id,
                    reference=invoice.reference,
                )
            )
            if invoice.status is InvoiceStatus.VOIDED:
                events.append(
                    TimelineEvent(
                        # voided_at is a UTC timestamp; the timeline is day-grained.
                        at=(
                            invoice.voided_at.date()
                            if invoice.voided_at
                            else invoice.issue_date
                        ),
                        kind="invoice_voided",
                        amount=invoice.total_ttc,
                        currency=invoice.currency.value,
                        invoice_id=invoice.id,
                        reference=invoice.reference,
                        detail=invoice.voided_reason,
                    )
                )
            for payment in payments_by_invoice[invoice.id]:
                events.append(
                    TimelineEvent(
                        at=payment.paid_on,
                        kind="payment_received",
                        amount=payment.amount,
                        currency=payment.currency.value,
                        invoice_id=invoice.id,
                        payment_id=payment.id,
                        reference=invoice.reference,
                        detail=payment.method.value,
                    )
                )

        for note in credit_notes:
            events.append(
                TimelineEvent(
                    at=note.issue_date,
                    kind="credit_note_issued",
                    amount=note.total_ttc,
                    currency=note.currency.value,
                    invoice_id=note.invoice_id,
                    credit_note_id=note.id,
                    reference=note.reference,
                    detail=references.get(note.invoice_id),
                )
            )

        # Newest first; ties broken by kind so a payment recorded on the same day
        # as its invoice does not sort above the invoice it settles.
        events.sort(key=lambda e: (e.at, _TIMELINE_ORDER.get(e.kind, 9)), reverse=True)
        return events[:limit]
