from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException

from core.repository import UnitOfWork
from core.tenancy import current_organization_id

from ..deps import get_uow_factory
from ..schemas.organizations import OrganizationResponse

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.get("/current", response_model=OrganizationResponse)
def current_org(
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    with uow_factory() as uow:
        org = uow.organizations.get(current_organization_id())
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        country_code=org.country_code,
        plan_tier=org.plan_tier.value,
    )
