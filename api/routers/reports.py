from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import ReportingService
from core.services.reporting_service import PERIOD_PATTERN

from ..deps import get_uow_factory
from ..schemas.reports import (
    KpiResponse,
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
