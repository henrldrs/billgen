from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from core.repository import UnitOfWork
from core.tenancy import current_organization_id

from ..authz import permissions_for
from ..deps import current_role, current_user_id, get_auth_service, get_uow_factory
from ..schemas.users import (
    PasswordChangeRequest,
    SessionResponse,
    UserMeResponse,
    UserUpdateRequest,
)
from ..security.errors import InvalidCredentialsError

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
def me(
    user_id: UUID = Depends(current_user_id),
    role: str = Depends(current_role),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    with uow_factory() as uow:
        user = uow.users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserMeResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        organization_id=current_organization_id(),
        role=role,
        permissions=sorted(p.value for p in permissions_for(role)),
    )


@router.patch("/me", response_model=UserMeResponse)
def update_me(
    body: UserUpdateRequest,
    user_id: UUID = Depends(current_user_id),
    role: str = Depends(current_role),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Edit your own profile.

    No permission is declared and none is right: this is a person changing their
    own display name, which every role including `viewer` may do. The identity
    it acts on comes from the token, not the request body, so there is nothing
    here to authorize *against* — a user cannot address anyone else's profile.
    """
    with uow_factory() as uow:
        user = uow.users.get(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        user.display_name = body.display_name
        stored = uow.users.update(user)
        uow.commit()

    return UserMeResponse(
        id=stored.id,
        email=stored.email,
        display_name=stored.display_name,
        organization_id=current_organization_id(),
        role=role,
        permissions=sorted(p.value for p in permissions_for(role)),
    )


# -- sessions and password ------------------------------------------------
#
# Under /users/me rather than the /auth/* paths the IA proposed, and not by
# preference: /auth/* is in the tenant middleware's public allowlist, so an
# endpoint there receives no authenticated caller and no organization. These
# two need to know who is asking, so they belong on an authenticated path.


@router.get("/me/sessions", response_model=list[SessionResponse])
def my_sessions(
    request: Request,
    user_id: UUID = Depends(current_user_id),
):
    """Live sign-ins for the caller.

    Refresh tokens rotate, so this lists only what is still valid — the whole
    table would show every refresh the browser has ever performed and read as a
    security incident rather than a session list.
    """
    service = get_auth_service(request)
    return [
        SessionResponse(
            jti=s.jti,
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in service.list_sessions(user_id)
    ]


@router.delete("/me/sessions/{jti}", status_code=204, response_class=Response)
def revoke_my_session(
    jti: UUID,
    request: Request,
    user_id: UUID = Depends(current_user_id),
):
    """Sign one session out.

    404 rather than 403 when the session belongs to someone else: the caller has
    no business learning that a given token id exists.
    """
    service = get_auth_service(request)
    if not service.revoke_session(user_id, jti):
        raise HTTPException(status_code=404, detail="Session not found")
    return Response(status_code=204)


@router.post("/me/password", status_code=204, response_class=Response)
def change_my_password(
    body: PasswordChangeRequest,
    request: Request,
    user_id: UUID = Depends(current_user_id),
):
    """Change your own password, proving the current one first.

    Every other session is revoked on success — someone changing a password
    because they believe it was seen needs the sessions it opened closed, and
    leaving them alive makes the change cosmetic. The caller's own refresh token
    goes with them, so the client must sign in again.
    """
    service = get_auth_service(request)
    try:
        service.change_password(user_id, body.current_password, body.new_password)
    except InvalidCredentialsError:
        #  401, not 422: the request was well-formed and the credential was
        #  wrong, which is an authentication failure rather than a bad field.
        raise HTTPException(status_code=401, detail="Current password is incorrect") from None
    return Response(status_code=204)
