"""GET /alerts — what needs attention, decided on the server.

The rules live in `core.services.alerts_service` so that "overdue" means the
same thing here, in the invoice report and on a badge. See that module for why
this is computed per request and stores nothing.
"""

from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.repository import UnitOfWork
from core.services import AlertsService

from ..deps import get_uow_factory
from ..schemas.alerts import AlertResponse, AlertsResponse

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=AlertsResponse)
def list_alerts(
    company_id: UUID,
    today: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
) -> AlertsResponse:
    """Overdue invoices, forgotten drafts, clients missing a VAT number, and the
    company's own identifiers — worst first.

    `today` is accepted so the answer can be asked for a given day rather than
    only for now; without it the engine could not be tested at all.
    """
    report = AlertsService(uow_factory).list(company_id, today=today, limit=limit)
    return AlertsResponse(
        company_id=report.company_id,
        as_of=report.as_of,
        alerts=[
            AlertResponse(
                code=alert.code.value,
                severity=alert.severity.value,
                target_type=alert.target_type,
                target_id=alert.target_id,
                title=alert.title,
                context=alert.context,
            )
            for alert in report.alerts
        ],
        counts_by_severity=report.counts_by_severity,
        counts_by_code=report.counts_by_code,
        truncated=report.truncated,
    )
