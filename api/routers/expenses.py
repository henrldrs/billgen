"""Expenses — supplier documents and what BillGen concludes about their TVA.

Rules live in `core.services.expense_service`. The two that shape this router:

**No quota.** Expense import ships unmetered, the way quotes did. Whether it
gets an allowance is a pricing decision rather than a default, and guessing one
here would set an expectation before anybody chose it.

**Nothing here computes a recoverable amount.** `POST /{id}/review` takes a
treatment and an optional percentage; the service derives the money. A request
body that could carry the figure is a request body that could carry the wrong
figure, and it lands in a VAT return.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from core.repository import UnitOfWork
from core.services import ExpenseService
from core.tenancy import current_organization_id
from core.tva.models import Expense
from core.tva.states import ExpenseState

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.expenses import (
    ExpenseImportRequest,
    ExpenseResponse,
    ExpenseReviewRequest,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _to_response(expense: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        **expense.model_dump(),
        #  Derived on the server so the exception queue and the analyzer agree
        #  about which rows need attention. Re-deriving it in TypeScript is how
        #  the two would drift.
        needs_attention=expense.needs_attention,
    )


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    company_id: UUID | None = None,
    state: str | None = Query(default=None),
    needs_attention: bool | None = Query(default=None),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    parsed: ExpenseState | None = None
    if state is not None:
        try:
            parsed = ExpenseState(state)
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Unknown expense state: {state}"
            ) from None
    expenses = ExpenseService(uow_factory).list(
        company_id=company_id, state=parsed, needs_attention=needs_attention
    )
    return [_to_response(expense) for expense in expenses]


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(ExpenseService(uow_factory).get(expense_id))


@router.post("/import", response_model=ExpenseResponse, status_code=201)
def import_expense(
    body: ExpenseImportRequest,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.EXPENSE_WRITE)),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Record one supplier document from extraction output.

    The client supplies `extracted` because extraction is a vendor decision
    nobody has made (§3 of the blueprint). Keeping that an explicit request
    field leaves the seam visible; when an extractor ships inside the product it
    fills this in and the service does not change.
    """
    expense = ExpenseService(uow_factory).import_document(
        organization_id=current_organization_id(),
        company_id=body.company_id,
        extracted=body.extracted,
        source_filename=body.source_filename,
        actor_id=user_id,
    )
    return _to_response(expense)


@router.post("/{expense_id}/review", response_model=ExpenseResponse)
def review_expense(
    expense_id: UUID,
    body: ExpenseReviewRequest,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TVA_REVIEW)),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Accept or override the suggested treatment.

    The only path by which a recoverable amount becomes confirmed, and therefore
    the only path by which it can reach `estimated_payable`.
    """
    expense = ExpenseService(uow_factory).review(
        expense_id,
        treatment=body.treatment,
        deductible_percent=body.deductible_percent,
        actor_id=user_id,
    )
    return _to_response(expense)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: UUID,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.EXPENSE_WRITE)),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Remove a mis-scanned document.

    Allowed at any state, unlike an invoice: importing an expense consumes no
    gapless number and creates no obligation.
    """
    ExpenseService(uow_factory).delete(expense_id, actor_id=user_id)
    return Response(status_code=204)
