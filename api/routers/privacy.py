"""A client is a data subject (T-35).

Two per-client acts the GDPR panel on Client 360 was drawn for, and the
consent store the trust surfaces have described since they were written.
Nothing here is public: every route is bound to the caller's organization.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.repository import UnitOfWork
from core.services import PrivacyService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.privacy import (
    ConsentRecordResponse,
    ConsentRequest,
    ConsentStatusResponse,
    PrivacyEraseResponse,
    PrivacyExportResponse,
)

router = APIRouter(tags=["privacy"])


@router.post("/clients/{client_id}/privacy/export", response_model=PrivacyExportResponse)
def export_client_data(
    client_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Everything held about this client — Article 15, as the controller hands
    it over. A read that every member may perform, audited because handing a
    person's data to someone is an event."""
    export = PrivacyService(uow_factory).export_client(client_id, actor_user_id=user_id)
    return PrivacyExportResponse(**export)


@router.post("/clients/{client_id}/privacy/erase", response_model=PrivacyEraseResponse)
def erase_client_data(
    client_id: UUID,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _perm: None = Depends(require_permission(Permission.PRIVACY_ERASE)),
):
    """Blank what the invoices do not carry, keep what they do.

    Belgian law retains an invoice seven years, and the invoice prints the
    client's name, VAT number and address — so those stay, and the response
    says so in the register's own words. Contact channels and notes go."""
    result = PrivacyService(uow_factory).erase_client(client_id, actor_user_id=user_id)
    return PrivacyEraseResponse(**result)


@router.get("/consent", response_model=ConsentStatusResponse)
def consent_status(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """The caller's decision in force, and every decision before it."""
    records = PrivacyService(uow_factory).consent_history(user_id)
    history = [ConsentRecordResponse.model_validate(r.model_dump()) for r in records]
    return ConsentStatusResponse(current=history[0] if history else None, history=history)


@router.post("/consent", response_model=ConsentRecordResponse, status_code=201)
def record_consent(
    body: ConsentRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Record a decision. The caller's own act on the caller's own identity,
    so no permission is declared — a viewer may decline analytics too."""
    record = PrivacyService(uow_factory).record_consent(
        user_id, policy_version=body.policy_version, state=body.state, source=body.source
    )
    return ConsentRecordResponse.model_validate(record.model_dump())
