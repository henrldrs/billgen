from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, BillingType, Product, ProductStatus
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

    def list(
        self,
        company_id: UUID | None = None,
        status: ProductStatus | None = None,
        billing_type: BillingType | None = None,
    ) -> list[Product]:
        """Catalog's Services and Archived views are `billing_type` and `status`
        slices. Filtered in Python, like ReportingService: fine at SMB catalog
        size, push into the repository when a tenant's catalog makes it slow."""
        with self._uow_factory() as uow:
            products = uow.products.list(company_id=company_id)
        if status is not None:
            products = [p for p in products if p.status is status]
        if billing_type is not None:
            products = [p for p in products if p.billing_type is billing_type]
        return products

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
