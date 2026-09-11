"""A consent decision, stored (T-35).

`core/trust/consent.py` defines the categories, their defaults and the shape
of one decision, and until now nothing kept one. This is the row: who, which
version of the policy they answered, what they said, and where they said it.
Retained on erasure (the register says so): a consent record is the proof a
choice was made, and proof is the one thing an erasure must not destroy.
"""

from uuid import UUID

from pydantic import Field

from ._base import TenantModel


class ConsentRecord(TenantModel):
    user_id: UUID
    policy_version: str = Field(min_length=1, max_length=32)
    #  Category key → granted. Normalised through `consent.normalise` before it
    #  is stored, so an omitted category is its default rather than absent.
    state: dict[str, bool]
    source: str = Field(default="settings", pattern="^(banner|settings|onboarding)$")
