from uuid import UUID

from pydantic import BaseModel


class UserMeResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    organization_id: UUID
    role: str
