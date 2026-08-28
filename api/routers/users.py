from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from core.repository import UnitOfWork
from core.tenancy import current_organization_id

from ..authz import permissions_for
from ..deps import current_role, current_user_id, get_uow_factory
from ..schemas.users import UserMeResponse, UserUpdateRequest

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
