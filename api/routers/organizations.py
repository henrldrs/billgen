from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from core.models import AuditAction
from core.repository import UnitOfWork
from core.services import _audit
from core.tenancy import current_organization_id

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..schemas.organizations import OrganizationResponse
from ..schemas.users import MemberResponse, MemberRoleUpdateRequest

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


@router.get("/current/members", response_model=list[MemberResponse])
def list_members(
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Everyone in this organization and the role each holds.

    A read, so no permission: every member may see who else is in the
    organization they belong to. Changing a role is the guarded half.
    """
    with uow_factory() as uow:
        members = uow.users.members_of(current_organization_id())
    return [
        MemberResponse(
            user_id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=membership.role.value,
        )
        for user, membership in members
    ]


@router.patch("/current/members/{user_id}", response_model=MemberResponse)
def set_member_role(
    user_id: UUID,
    body: MemberRoleUpdateRequest,
    actor_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.COMPANY_WRITE)),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Change what one member may do.

    Guarded by `company.write` — an admin permission — because a role decides
    what someone may do to the organization's records, which is the same class
    of act as editing the legal entity.

    Refuses to change your own role. Not paternalism: the last owner demoting
    themselves leaves an organization nobody can administer, and the check that
    would allow it safely (is there another owner?) is one nobody remembers to
    write. Ask another owner.
    """
    if user_id == actor_id:
        raise HTTPException(
            status_code=409,
            detail="You cannot change your own role. Ask another owner or admin.",
        )

    org_id = current_organization_id()
    with uow_factory() as uow:
        try:
            membership = uow.users.set_role(org_id, user_id, body.role)
        except KeyError:
            raise HTTPException(
                status_code=404, detail="Not a member of this organization"
            ) from None
        user = uow.users.get(user_id)
        _audit.record(
            uow,
            actor_user_id=actor_id,
            action=AuditAction.UPDATE,
            target_type="membership",
            target_id=user_id,
            after={"role": membership.role.value},
        )
        uow.commit()

    return MemberResponse(
        user_id=user_id,
        email=user.email if user else "",
        display_name=user.display_name if user else "",
        role=membership.role.value,
    )
