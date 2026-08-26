from enum import Enum

from pydantic import Field

from ._base import IdentifiedModel


class PlanTier(str, Enum):
    """The commercial tier an organization is on.

    This is a *fact about the organization*, which is why it lives in the
    domain. What each tier is allowed to do is **not** here: that matrix lives
    in `api/entitlements/matrix.py`, so a price change or a quota change never
    touches domain code. CORE must never branch on a tier.
    """

    FREE = "free"
    STARTER = "starter"
    BUSINESS = "business"
    BUSINESS_PRO = "business_pro"


class Organization(IdentifiedModel):
    name: str = Field(min_length=1, max_length=200)
    country_code: str = Field(default="BE", min_length=2, max_length=2)
    plan_tier: PlanTier = PlanTier.FREE
    stripe_customer_id: str | None = None
