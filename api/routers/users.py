from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from core.repository import UnitOfWork
from core.tenancy import current_organization_id

from ..deps import current_role, current_user_id, get_uow_factory
from ..schemas.users import UserMeResponse

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
    )
