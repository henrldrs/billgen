from uuid import UUID

from pydantic import BaseModel, Field


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
