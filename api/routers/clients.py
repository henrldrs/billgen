from collections.abc import Callable
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.models import Client
from core.repository import UnitOfWork
from core.services import ClientService, ReportingService
from core.tenancy import current_organization_id

from ..deps import current_user_id, get_uow_factory
from ..entitlements import Meter, require_quota
from ..schemas.clients import ClientCreateRequest, ClientResponse, ClientUpdateRequest
from ..schemas.insights import ClientStatsResponse, TimelineEventResponse

router = APIRouter(prefix="/clients", tags=["clients"])


def _to_response(client: Client) -> ClientResponse:
    return ClientResponse.model_validate(client.model_dump())


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    body: ClientCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _quota: None = Depends(require_quota(Meter.CLIENTS)),
):
    client = Client(organization_id=current_organization_id(), **body.model_dump())
    return _to_response(ClientService(uow_factory).create(client, actor_user_id=user_id))


@router.get("", response_model=list[ClientResponse])
def list_clients(
    company_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return [_to_response(c) for c in ClientService(uow_factory).list(company_id=company_id)]


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(ClientService(uow_factory).get(client_id))


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    body: ClientUpdateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    service = ClientService(uow_factory)
    existing = service.get(client_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return _to_response(existing)
    updated = existing.model_copy(update=changes)
    return _to_response(service.update(updated, actor_user_id=user_id))


@router.get("/{client_id}/stats", response_model=ClientStatsResponse)
def client_stats(
    client_id: UUID,
    today: date | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Client 360's header numbers in one call, instead of the whole invoice list
    plus a payments fetch per invoice."""
    stats = ReportingService(uow_factory).client_stats(client_id, today=today)
    return ClientStatsResponse.model_validate(stats, from_attributes=True)


@router.get("/{client_id}/timeline", response_model=list[TimelineEventResponse])
def client_timeline(
    client_id: UUID,
    limit: int = Query(default=100, ge=1, le=500),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """The commercial history: invoices, credit notes and payments, newest first.

    Not the audit log. Audit entries for an invoice carry no client id, so
    `GET /activity?target_id=<client>` returns edits to the client record and can
    never return what was sold to them."""
    events = ReportingService(uow_factory).client_timeline(client_id, limit=limit)
    return [TimelineEventResponse.model_validate(e, from_attributes=True) for e in events]
