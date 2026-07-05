from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import DomainModel, IdentifiedModel


class Role(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class User(IdentifiedModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str = Field(min_length=1, max_length=200)
    email_verified: bool = False
    is_active: bool = True


class OrgMembership(DomainModel):
    organization_id: UUID
    user_id: UUID
    role: Role = Role.MEMBER
