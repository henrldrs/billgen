from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from ..models import Invoice, InvoiceStatus
from ..repository import UnitOfWork

_ZERO = Decimal(0)


@dataclass(frozen=True)
class KpiSummary:
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    counts: dict[str, int]
    overdue_count: int


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
