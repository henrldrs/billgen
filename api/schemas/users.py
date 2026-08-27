from uuid import UUID

from pydantic import BaseModel


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
