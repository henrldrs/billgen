from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from core.models import Payment, PaymentMethod
from core.repository import UnitOfWork
from core.services import PaymentService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.payments import (
    PaymentCreateRequest,
    PaymentRecordResponse,
    PaymentResponse,
)

router = APIRouter(prefix="/payments", tags=["payments"])


def _to_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse.model_validate(payment.model_dump())


@router.post("", response_model=PaymentRecordResponse, status_code=201)
def record_payment(
    body: PaymentCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.PAYMENT_WRITE)),
):
    try:
        method = PaymentMethod(body.method)
    except ValueError:
        raise HTTPException(
            status_code=422, detail=f"Unknown payment method: {body.method}"
        ) from None

    payment, invoice = PaymentService(uow_factory).record(
        invoice_id=body.invoice_id,
        amount=body.amount,
        paid_on=body.paid_on,
        method=method,
        reference=body.reference,
        notes=body.notes,
        actor_user_id=user_id,
    )
    return PaymentRecordResponse(
        payment=_to_response(payment), invoice_status=invoice.status.value
    )


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    invoice_id: UUID | None = None,
    company_id: UUID | None = None,
    client_id: UUID | None = None,
    paid_from: date | None = Query(default=None),
    paid_to: date | None = Query(default=None),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Payments, newest first. `invoice_id` used to be required, which made a
    cross-invoice payments report impossible; every filter is now optional and
    combinable (`company_id`, `client_id`, `paid_from`/`paid_to` inclusive)."""
    payments = PaymentService(uow_factory).list(
        company_id=company_id,
        client_id=client_id,
        invoice_id=invoice_id,
        paid_from=paid_from,
        paid_to=paid_to,
    )
    return [_to_response(payment) for payment in payments]
