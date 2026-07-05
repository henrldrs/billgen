from enum import Enum

from pydantic import Field

from ._base import IdentifiedModel


class PlanTier(str, Enum):
    FREE = "free"
    PERSONAL = "personal"
    BUSINESS = "business"


class Organization(IdentifiedModel):
    name: str = Field(min_length=1, max_length=200)
    country_code: str = Field(default="BE", min_length=2, max_length=2)
    plan_tier: PlanTier = PlanTier.FREE
    stripe_customer_id: str | None = None
