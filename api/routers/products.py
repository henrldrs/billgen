from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.models import Product
from core.repository import UnitOfWork
from core.services import ProductService
from core.tenancy import current_organization_id

from ..deps import current_user_id, get_uow_factory
from ..schemas.products import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
)

router = APIRouter(prefix="/products", tags=["products"])


def _to_response(product: Product) -> ProductResponse:
    return ProductResponse.model_validate(product.model_dump())


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    body: ProductCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    product = Product(organization_id=current_organization_id(), **body.model_dump())
    return _to_response(ProductService(uow_factory).create(product, actor_user_id=user_id))


@router.get("", response_model=list[ProductResponse])
def list_products(
    company_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return [_to_response(p) for p in ProductService(uow_factory).list(company_id=company_id)]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(ProductService(uow_factory).get(product_id))


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    body: ProductUpdateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    service = ProductService(uow_factory)
    existing = service.get(product_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return _to_response(existing)
    updated = existing.model_copy(update=changes)
    return _to_response(service.update(updated, actor_user_id=user_id))
