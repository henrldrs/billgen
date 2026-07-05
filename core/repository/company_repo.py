from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Company


class CompanyRepository(ABC):
    @abstractmethod
    def add(self, company: Company) -> Company: ...

    @abstractmethod
    def get(self, company_id: UUID) -> Company | None: ...

    @abstractmethod
    def list(self) -> list[Company]: ...

    @abstractmethod
    def update(self, company: Company) -> Company: ...
