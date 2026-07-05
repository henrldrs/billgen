from uuid import UUID

from pydantic import BaseModel


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    country_code: str
    plan_tier: str
