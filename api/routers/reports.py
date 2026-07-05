from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends

from core.repository import UnitOfWork
from core.services import ReportingService

from ..deps import get_uow_factory
from ..schemas.reports import KpiResponse, RevenueByMonthResponse

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
