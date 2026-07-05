from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.models import Client
from core.repository import UnitOfWork
from core.services import ClientService
from core.tenancy import current_organization_id

from ..deps import current_user_id, get_uow_factory
from ..schemas.clients import ClientCreateRequest, ClientResponse, ClientUpdateRequest

router = APIRouter(prefix="/clients", tags=["clients"])


def _to_response(client: Client) -> ClientResponse:
    return ClientResponse.model_validate(client.model_dump())


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    body: ClientCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
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
