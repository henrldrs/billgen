from fastapi import APIRouter, Depends, HTTPException, Request

from ..deps import get_auth_service
from ..schemas.auth import LoginResponse, MembershipOut, TokenResponse
from ..security import AuthService

# Path lives under /auth/* so the tenant middleware treats it as public.
router = APIRouter(prefix="/auth", tags=["desktop"])


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
