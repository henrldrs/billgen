from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from core.models import Payment, PaymentMethod
from core.repository import UnitOfWork
from core.services import PaymentService

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
    invoice_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    payments = PaymentService(uow_factory).list_for_invoice(invoice_id)
    return [_to_response(payment) for payment in payments]
