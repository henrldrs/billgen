from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Client
from ..repository import UnitOfWork
from . import _audit
from .errors import NotFoundError


class ClientService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create(self, client: Client, actor_user_id: UUID | None = None) -> Client:
        with self._uow_factory() as uow:
            if uow.companies.get(client.company_id) is None:
                raise NotFoundError(f"Company {client.company_id} not found")
            saved = uow.clients.add(client)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="client",
                target_id=saved.id,
                after={"name": saved.name},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def get(self, client_id: UUID) -> Client:
        with self._uow_factory() as uow:
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            return client

    def list(self, company_id: UUID | None = None) -> list[Client]:
        with self._uow_factory() as uow:
            return uow.clients.list(company_id=company_id)

    def update(self, client: Client, actor_user_id: UUID | None = None) -> Client:
        with self._uow_factory() as uow:
            before = uow.clients.get(client.id)
            if before is None:
                raise NotFoundError(f"Client {client.id} not found")
            saved = uow.clients.update(client)
            _audit.record(
                uow,
                action=AuditAction.UPDATE,
                target_type="client",
                target_id=saved.id,
                before={"name": before.name},
                after={"name": saved.name},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved
