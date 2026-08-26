"""The two commercial refusals, and the wire shape they turn into.

**402 means commercially unavailable. 403 means authenticated but not
authorized.** Keeping those apart is the whole point: a 403 tells the user they
are in the wrong place, a 402 tells them BillGen works fine and their plan does
not include this. Only the second one should ever open an upgrade modal.
"""

from __future__ import annotations

from core.models import PlanTier

from .matrix import Meter


class EntitlementError(Exception):
    """Base for anything that should surface as 402 Payment Required."""

    def body(self) -> dict:  # pragma: no cover - overridden
        raise NotImplementedError


class EntitlementRequiredError(EntitlementError):
    """The plan does not include this capability at all."""

    def __init__(
        self, feature: str, required_tier: PlanTier | None, message: str | None = None
    ) -> None:
        self.feature = feature
        self.required_tier = required_tier
        self.message = message or "This feature requires a higher plan."
        super().__init__(self.message)

    def body(self) -> dict:
        return {
            "error": "entitlement_required",
            "required_tier": self.required_tier.value if self.required_tier else None,
            "feature": self.feature,
            "message": self.message,
        }


class UsageLimitReachedError(EntitlementError):
    """The plan includes this capability, but the allowance is spent.

    Raised only when *creating* a new billable resource. Reading, editing,
    exporting or correcting something that already exists is never refused for
    a quota reason — a customer's own business records are not put behind a
    paywall.
    """

    def __init__(
        self,
        meter: Meter,
        limit: int,
        used: int,
        period: str | None,
        required_tier: PlanTier | None,
    ) -> None:
        self.meter = meter
        self.limit = limit
        self.used = used
        self.period = period
        self.required_tier = required_tier
        super().__init__(f"{meter.value} limit of {limit} reached")

    def body(self) -> dict:
        return {
            "error": "usage_limit_reached",
            "required_tier": self.required_tier.value if self.required_tier else None,
            "feature": self.meter.value,
            "limit": self.limit,
            "used": self.used,
            "period": self.period,
            "message": (
                f"Your plan includes {self.limit} {self.meter.value.replace('_', ' ')}"
                + (f" per month ({self.period})." if self.period else ".")
            ),
        }
