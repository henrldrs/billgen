from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from core.models import Role


class UserMeResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    organization_id: UUID
    role: str
    # What this role may do, so the UI can hide a button it knows will 403.
    # Hiding is UX; `api/authz` is the enforcement point, and it refuses the
    # call regardless of what the client chose to render.
    permissions: list[str] = []


class UserUpdateRequest(BaseModel):
    """A user editing their own profile.

    Display name only. Changing an email address is an identity change, not a
    profile edit — the new address has to be verified before it becomes the
    login, and verification needs email transport the product does not have
    (blocker B1). Accepting it here would let someone lock themselves out of
    their own account with a typo.
    """

    display_name: str = Field(min_length=1, max_length=200)


class SessionResponse(BaseModel):
    """One live sign-in.

    Deliberately without device, browser or location. `audit_log` has columns
    for IP and user agent and nothing writes them, so a "Chrome on Windows,
    Brussels" line here would be invented rather than reported — and the privacy
    inventory says that data is not collected.
    """

    jti: UUID
    created_at: datetime
    expires_at: datetime
    #  True for the token that made this request, so the screen can label it and
    #  refuse to offer "revoke" for the session you are sitting in.
    current: bool = False


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    #  Same floor as signup. A change path that accepts a weaker password than
    #  registration is a downgrade attack with extra steps.
    new_password: str = Field(min_length=12, max_length=200)


class MemberResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: str
    role: str


class MemberRoleUpdateRequest(BaseModel):
    role: Role
