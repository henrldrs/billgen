from uuid import UUID

from pydantic import BaseModel, Field


class OrganizationUpdateRequest(BaseModel):
    """The tenant's own label. Not the legal entity — that is a Company, and
    its name carries the mandatory mentions."""

    name: str = Field(min_length=1, max_length=200)


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    country_code: str
    plan_tier: str
