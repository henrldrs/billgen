from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.models import Company
from core.repository import UnitOfWork
from core.services import CompanyService
from core.tenancy import current_organization_id

from ..deps import current_user_id, get_uow_factory
from ..schemas.companies import CompanyCreateRequest, CompanyResponse

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_response(company: Company) -> CompanyResponse:
    return CompanyResponse.model_validate(company.model_dump())


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    body: CompanyCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    company = Company(
        organization_id=current_organization_id(),
        **body.model_dump(),
    )
    saved = CompanyService(uow_factory).create(company, actor_user_id=user_id)
    return _to_response(saved)


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return [_to_response(company) for company in CompanyService(uow_factory).list()]
