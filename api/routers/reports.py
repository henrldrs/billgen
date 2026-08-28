from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import ReportingService
from core.services.reporting_service import PERIOD_PATTERN

from ..deps import get_uow_factory
from ..schemas.insights import InvoiceReportResponse
from ..schemas.reports import (
    ClientReportResponse,
    KpiResponse,
    PaymentReportResponse,
    ProductReportResponse,
    RevenueByMonthResponse,
    VatReportResponse,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/kpi", response_model=KpiResponse)
def kpi(
    company_id: UUID,
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    summary = ReportingService(uow_factory).kpi_summary(company_id, today=today)
    return KpiResponse(
        invoiced_total=summary.invoiced_total,
        paid_total=summary.paid_total,
        outstanding_total=summary.outstanding_total,
        counts=summary.counts,
        overdue_count=summary.overdue_count,
    )


@router.get("/revenue", response_model=RevenueByMonthResponse)
def revenue(
    company_id: UUID,
    year: int,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    months = ReportingService(uow_factory).revenue_by_month(company_id, year)
    return RevenueByMonthResponse(year=year, months=months)


@router.get("/vat", response_model=VatReportResponse)
def vat(
    company_id: UUID,
    period: str = Query(pattern=PERIOD_PATTERN, examples=["2026-Q3"]),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """`period` is a year (`2026`), a quarter (`2026-Q3`) or a month
    (`2026-07`). Output VAT only — see `VatReportResponse`."""
    report = ReportingService(uow_factory).vat_report(company_id, period)
    return VatReportResponse.model_validate(report, from_attributes=True)


@router.get("/invoices", response_model=InvoiceReportResponse)
def invoice_report(
    company_id: UUID,
    period: str | None = Query(default=None, pattern=PERIOD_PATTERN, examples=["2026-Q3"]),
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Counts and totals per effective status, plus a monthly series. Replaces
    aggregating the full invoice list in the browser. Omit `period` for all time."""
    report = ReportingService(uow_factory).invoice_report(company_id, period, today=today)
    return InvoiceReportResponse.model_validate(report, from_attributes=True)


@router.get("/payments", response_model=PaymentReportResponse)
def payment_report(
    company_id: UUID,
    period: str | None = Query(default=None, pattern=PERIOD_PATTERN, examples=["2026-Q3"]),
    client_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Total received, split by method and by month. Omit `period` for all time.

    The payments screen deliberately printed no total until this existed:
    summing the rows in the browser gives the total of the page, which is a
    different number from the total of the filter, and the wrong one.
    """
    report = ReportingService(uow_factory).payment_report(
        company_id, period, client_id=client_id
    )
    return PaymentReportResponse.model_validate(report, from_attributes=True)


@router.get("/clients", response_model=ClientReportResponse)
def client_report(
    company_id: UUID,
    period: str | None = Query(default=None, pattern=PERIOD_PATTERN, examples=["2026-Q3"]),
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Revenue and debt per client, biggest first. Omit `period` for all time.

    `GET /clients/{id}/stats` answers this for one client; calling it once per
    row is the N+1 that report was written to avoid.
    """
    report = ReportingService(uow_factory).client_report(company_id, period, today=today)
    return ClientReportResponse.model_validate(report, from_attributes=True)


@router.get("/products", response_model=ProductReportResponse)
def product_report(
    company_id: UUID,
    period: str | None = Query(default=None, pattern=PERIOD_PATTERN, examples=["2026-Q3"]),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """What sold, by invoice line rather than by document.

    Read the caveat in `ProductReportResponse` before putting this beside
    revenue: line net HT carries no share of an invoice-level discount, on
    purpose, so the two totals are answers to different questions.
    """
    report = ReportingService(uow_factory).product_report(company_id, period)
    return ProductReportResponse.model_validate(report, from_attributes=True)
