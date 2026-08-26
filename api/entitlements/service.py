"""Resolving a subscription into what it is allowed to do.

Three concepts kept deliberately apart, because conflating them is what makes
billing code rot:

- **Subscription** — the commercial state of the tenant (`free`, `starter`,
  `past_due`, …). Owned by the billing provider, eventually.
- **Entitlement** — what that state permits. `allows("recurring_invoices")`.
- **Usage** — how much of an allowance is spent. `47 / 50 invoices`.

The billing provider is an adapter that writes the first one. Everything below
reads it. That is why this layer can ship, and be tested, with no Stripe.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.models import PlanTier
from db.models import OrganizationRow, SubscriptionRow

from .errors import EntitlementRequiredError, UsageLimitReachedError
from .matrix import (
    FEATURES,
    METER_KINDS,
    QUOTAS,
    Meter,
    MeterKind,
    cheapest_tier_over,
    cheapest_tier_with,
)
from .usage import MeterUsage, count_used, current_period

# Subscription states that still entitle the tenant to their paid tier. Anything
# else falls back to FREE limits — but note what that does *not* do: it never
# deletes, hides or locks existing data. An over-limit tenant keeps every record
# and simply cannot create new ones. See `check_meter`.
_ACTIVE_STATUSES = {"active", "trialing", "past_due"}


@dataclass(frozen=True)
class Entitlements:
    organization_id: UUID
    tier: PlanTier
    subscription_status: str

    def allows(self, feature: str) -> bool:
        return bool(FEATURES.get(self.tier, {}).get(feature))

    def grade(self, feature: str) -> bool | str | None:
        """The graded value of a feature (`"basic"`, `"full"`, `True`, …).

        The frontend uses this to pick a variant of a screen; the backend only
        enforces the boolean features and the meters.
        """
        return FEATURES.get(self.tier, {}).get(feature)

    def limit(self, meter: Meter) -> int | None:
        return QUOTAS[self.tier].get(meter)

    def require(self, feature: str) -> None:
        if not self.allows(feature):
            raise EntitlementRequiredError(feature, cheapest_tier_with(feature))


def resolve_tier(session: Session, organization_id: UUID) -> tuple[PlanTier, str]:
    """The tier this organization is actually entitled to right now.

    `SubscriptionRow` wins when it exists and is in a paying state, because that
    is what the billing webhook will write. `Organization.plan_tier` is the
    fallback and the seed value, so the whole layer works today with no billing
    provider connected at all.
    """
    subscription = session.execute(
        select(SubscriptionRow).where(SubscriptionRow.organization_id == organization_id)
    ).scalar_one_or_none()

    if subscription is not None and subscription.status in _ACTIVE_STATUSES:
        try:
            return PlanTier(subscription.plan_tier), subscription.status
        except ValueError:
            pass  # Unknown tier string from a provider: fall through to the org.

    org = session.get(OrganizationRow, organization_id)
    status = subscription.status if subscription is not None else "none"
    if org is None:
        return PlanTier.FREE, status
    try:
        return PlanTier(org.plan_tier), status
    except ValueError:
        return PlanTier.FREE, status


def resolve(session: Session, organization_id: UUID) -> Entitlements:
    tier, status = resolve_tier(session, organization_id)
    return Entitlements(
        organization_id=organization_id, tier=tier, subscription_status=status
    )


def meter_usage(
    session: Session, entitlements: Entitlements, meter: Meter
) -> MeterUsage:
    period = (
        current_period() if METER_KINDS[meter] is MeterKind.FLOW else None
    )
    return MeterUsage(
        meter=meter,
        used=count_used(session, entitlements.organization_id, meter, period),
        limit=entitlements.limit(meter),
        period=period,
    )


def check_meter(session: Session, entitlements: Entitlements, meter: Meter) -> MeterUsage:
    """Refuse to create one more unit of `meter` if the allowance is spent.

    Only ever called on creation. An over-limit tenant — someone who downgraded
    from Business with three companies — keeps all three companies, can still
    invoice from them, edit them, export them and back them up. What they cannot
    do is add a fourth. The cap governs new billable resources, never access to
    business records that already exist.
    """
    usage = meter_usage(session, entitlements, meter)
    if usage.exhausted:
        raise UsageLimitReachedError(
            meter=meter,
            limit=usage.limit,
            used=usage.used,
            period=usage.period,
            required_tier=cheapest_tier_over(meter, usage.used + 1),
        )
    return usage


@contextmanager
def quota_guard(session: Session, organization_id: UUID, meter: Meter):
    """Check a quota and hold the check open until the caller's write lands.

    The naive shape — read 49, return, create, someone else also read 49 — lets
    two concurrent requests both create the 50th invoice. So this takes a row
    lock on the organization before counting and holds it until the endpoint
    body has finished its own transaction. Every quota check for one tenant
    serializes on that single row; different tenants never contend.

    The lock is a no-op on SQLite (one connection behind a StaticPool, which is
    what the desktop build and the test suite run), and a real `FOR UPDATE` on
    Postgres — the same asymmetry, for the same reason, as the gapless
    numbering counter in `db/repositories/sqlalchemy_repositories.py`.
    """
    session.execute(
        select(OrganizationRow.id)
        .where(OrganizationRow.id == organization_id)
        .with_for_update()
    ).scalar_one_or_none()

    entitlements = resolve(session, organization_id)
    check_meter(session, entitlements, meter)
    try:
        yield entitlements
    finally:
        # Releases the lock either way. Nothing was written here, so there is
        # nothing to roll back and nothing to compensate if the body failed —
        # the count is derived from the rows the body did or did not create.
        session.rollback()
