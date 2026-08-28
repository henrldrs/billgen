"""The TVA position for a period.

Read-only, and separate from `/expenses` on purpose: an expense is a document,
a position is a period's arithmetic over many of them. Collapsing them would
give `/expenses` a query parameter that changes what the endpoint *is*.

The response carries `confirmed_recoverable` and `potential_recoverable` as two
figures with no combined total, and `estimated_payable` built from the confirmed
half alone. That is the blueprint's locked decision and it survives here rather
than being reassembled by whichever screen renders it.
"""

from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from core.repository import UnitOfWork
from core.services import ExpenseService

from ..deps import get_uow_factory
from ..schemas.expenses import TreatmentBreakdownOut, TvaPositionResponse

router = APIRouter(prefix="/tva", tags=["tva"])


@router.get("/position", response_model=TvaPositionResponse)
def get_position(
    company_id: UUID,
    start: date = Query(description="First day of the period, inclusive"),
    end: date = Query(description="Last day of the period, inclusive"),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    if end < start:
        raise HTTPException(status_code=422, detail="end must not precede start")

    position = ExpenseService(uow_factory).position(company_id, start, end)
    return TvaPositionResponse(
        period_start=start,
        period_end=end,
        expenses_analyzed=position.expenses_analyzed,
        collected=position.collected,
        detected=position.detected,
        confirmed_recoverable=position.confirmed_recoverable,
        potential_recoverable=position.potential_recoverable,
        review_required=position.review_required,
        non_recoverable=position.non_recoverable,
        # Properties, sent explicitly. A client that has to subtract two figures
        # itself is a client that can subtract the wrong pair.
        estimated_payable=position.estimated_payable,
        is_complete=position.is_complete,
        unresolved_exceptions=position.unresolved_exceptions,
        breakdown=[
            TreatmentBreakdownOut(**entry.model_dump()) for entry in position.breakdown
        ],
    )
