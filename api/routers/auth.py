from fastapi import APIRouter, Depends, Response

from ..deps import get_auth_service
from ..schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    MembershipOut,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)
from ..security import AuthService, TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens(pair: TokenPair) -> TokenResponse:
    return TokenResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        token_type=pair.token_type,
        expires_in=pair.expires_in,
    )


@router.post("/signup", response_model=SignupResponse, status_code=201)
def signup(body: SignupRequest, service: AuthService = Depends(get_auth_service)):
    result = service.signup(
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        organization_name=body.organization_name,
    )
    return SignupResponse(
        user_id=result.user_id,
        email=result.email,
        display_name=result.display_name,
        organization_id=result.organization_id,
        organization_name=result.organization_name,
        tokens=_tokens(result.tokens),
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, service: AuthService = Depends(get_auth_service)):
    result = service.login(
        email=body.email, password=body.password, organization_id=body.organization_id
    )
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
        tokens=_tokens(result.tokens),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, service: AuthService = Depends(get_auth_service)):
    return _tokens(service.refresh(body.refresh_token))


@router.post("/logout", status_code=204, response_class=Response)
def logout(body: LogoutRequest, service: AuthService = Depends(get_auth_service)):
    service.logout(body.refresh_token)
