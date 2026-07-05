from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Client


class ClientRepository(ABC):
    @abstractmethod
    def add(self, client: Client) -> Client: ...

    @abstractmethod
    def get(self, client_id: UUID) -> Client | None: ...

    @abstractmethod
    def list(self, company_id: UUID | None = None) -> list[Client]: ...

    @abstractmethod
    def update(self, client: Client) -> Client: ...
