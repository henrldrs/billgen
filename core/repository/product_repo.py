from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Product


class ProductRepository(ABC):
    @abstractmethod
    def add(self, product: Product) -> Product: ...

    @abstractmethod
    def get(self, product_id: UUID) -> Product | None: ...

    @abstractmethod
    def list(self, company_id: UUID | None = None) -> list[Product]: ...

    @abstractmethod
    def update(self, product: Product) -> Product: ...
