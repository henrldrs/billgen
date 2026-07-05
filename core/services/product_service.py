from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Product
from ..repository import UnitOfWork
from . import _audit
from .errors import NotFoundError


class ProductService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create(self, product: Product, actor_user_id: UUID | None = None) -> Product:
        with self._uow_factory() as uow:
            if uow.companies.get(product.company_id) is None:
                raise NotFoundError(f"Company {product.company_id} not found")
            saved = uow.products.add(product)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="product",
                target_id=saved.id,
                after={"name": saved.name, "unit_price": saved.unit_price},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def get(self, product_id: UUID) -> Product:
        with self._uow_factory() as uow:
            product = uow.products.get(product_id)
            if product is None:
                raise NotFoundError(f"Product {product_id} not found")
            return product

    def list(self, company_id: UUID | None = None) -> list[Product]:
        with self._uow_factory() as uow:
            return uow.products.list(company_id=company_id)

    def update(self, product: Product, actor_user_id: UUID | None = None) -> Product:
        with self._uow_factory() as uow:
            before = uow.products.get(product.id)
            if before is None:
                raise NotFoundError(f"Product {product.id} not found")
            saved = uow.products.update(product)
            _audit.record(
                uow,
                action=AuditAction.UPDATE,
                target_type="product",
                target_id=saved.id,
                before={"name": before.name, "unit_price": before.unit_price},
                after={"name": saved.name, "unit_price": saved.unit_price},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved
