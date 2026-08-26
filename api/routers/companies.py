from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.models import Company
from core.repository import UnitOfWork
from core.services import CompanyService, validate_company_identifiers
from core.tenancy import current_organization_id

from ..deps import current_user_id, get_uow_factory
from ..entitlements import Meter, require_quota
from ..schemas.companies import (
    CompanyCreateRequest,
    CompanyResponse,
    CompanyUpdateRequest,
)
from ..schemas.insights import CompanyValidationResponse

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_response(company: Company) -> CompanyResponse:
    return CompanyResponse.model_validate(company.model_dump())


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    body: CompanyCreateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    _quota: None = Depends(require_quota(Meter.COMPANIES)),
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


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(CompanyService(uow_factory).get(company_id))


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: UUID,
    body: CompanyUpdateRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    service = CompanyService(uow_factory)
    existing = service.get(company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return _to_response(existing)
    # Re-validate the whole model rather than model_copy(update=...): copy skips
    # validation even with validate_assignment, so an explicit null on a
    # non-nullable field (country_code, default_currency) would slip through.
    updated = Company.model_validate({**existing.model_dump(), **changes})
    return _to_response(service.update(updated, actor_user_id=user_id))


@router.get("/{company_id}/validation", response_model=CompanyValidationResponse)
def validate_company(
    company_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Per-field verdict on this company's own identifiers (VAT mod-97, IBAN
    ISO 13616, BIC ISO 9362) plus what is still missing before it could act as a
    Peppol supplier.

    `core/rules/identifiers.py` has been able to answer this since the Peppol
    port; nothing ever offered it to a settings form, so a VAT typo was only
    discovered at export time. Supplier side only — see
    `CompanyValidationResponse`."""
    company = CompanyService(uow_factory).get(company_id)
    return CompanyValidationResponse.model_validate(
        validate_company_identifiers(company), from_attributes=True
    )
