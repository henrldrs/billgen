from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import delete, update

from core.models import PlanTier
from core.tenancy import current_organization_id
from db.models import OrganizationRow, SubscriptionRow

from ..deps import current_user_id, get_auth_service
from ..schemas.auth import LoginResponse, MembershipOut, TokenResponse
from ..security import AuthService

# Two routers, and the split is the point.
#
# `router` lives under /auth/* so the tenant middleware treats it as public —
# the bootstrap has to work before a session exists.
#
# `dev_router` must NOT: it needs to know which organization is asking, and the
# middleware only binds tenant context for paths outside the public allowlist.
# Mounted under /desktop/* it is authenticated like everything else, which is
# also what stops it being a public write on a hosted deployment even before the
# desktop_mode check runs.
router = APIRouter(prefix="/auth", tags=["desktop"])
dev_router = APIRouter(prefix="/desktop", tags=["desktop"])


@router.post("/desktop-bootstrap", response_model=LoginResponse)
def desktop_bootstrap(
    request: Request,
    service: AuthService = Depends(get_auth_service),
):
    """Local single-user session for the desktop build. 404 unless desktop_mode
    is on, so a hosted deployment cannot be coerced into minting an account."""
    if not request.app.state.settings.desktop_mode:
        raise HTTPException(status_code=404, detail="Not found")

    result = service.desktop_bootstrap()
    return LoginResponse(
        user_id=result.user_id,
        email=result.email,
        display_name=result.display_name,
        organization_id=result.organization_id,
        role=result.role,
        memberships=[
            MembershipOut(organization_id=org_id, role=role)
            for org_id, role in result.memberships
        ],
        tokens=TokenResponse(
            access_token=result.tokens.access_token,
            refresh_token=result.tokens.refresh_token,
            token_type=result.tokens.token_type,
            expires_in=result.tokens.expires_in,
        ),
    )


class DevTierRequest(BaseModel):
    plan_tier: PlanTier


class DevTierResponse(BaseModel):
    plan_tier: PlanTier
    cleared_subscription: bool


@dev_router.post("/plan-tier", response_model=DevTierResponse)
def set_desktop_plan_tier(
    request: Request,
    body: DevTierRequest,
    user_id: UUID = Depends(current_user_id),
):
    """Move the local dev organization onto a tier, so the entitlement layer can
    be exercised without a checkout provider.

    404 unless desktop_mode, exactly like the bootstrap above: a hosted
    deployment must not expose a way to grant itself a plan. That is the whole
    security argument for this endpoint, and it is the same one that lets the
    bootstrap mint a session.

    **It deletes any SubscriptionRow.** `resolve_tier` prefers an active
    subscription over `Organization.plan_tier`, so writing the column alone
    would appear to do nothing the moment a subscription exists — the switch
    would silently not work and the next person would go looking in the wrong
    place. Checkout is the deferred half of B4 and nothing writes that row yet;
    when something does, this stays honest by clearing it.
    """
    if not request.app.state.settings.desktop_mode:
        raise HTTPException(status_code=404, detail="Not found")

    org_id = current_organization_id()
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        cleared = session.execute(
            delete(SubscriptionRow).where(SubscriptionRow.organization_id == org_id)
        ).rowcount
        session.execute(
            update(OrganizationRow)
            .where(OrganizationRow.id == org_id)
            .values(plan_tier=body.plan_tier.value)
        )
        session.commit()

    return DevTierResponse(
        plan_tier=body.plan_tier, cleared_subscription=bool(cleared)
    )
