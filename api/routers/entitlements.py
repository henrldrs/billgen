"""What this tenant's plan allows, and what every plan allows.

`GET /entitlements` is read by the shell on boot so screens can render the right
variant and badge what is not included. It is a convenience for the UI, never
the enforcement point — every gated endpoint re-checks and answers 402.
"""

from fastapi import APIRouter, Depends, Request

from ..entitlements import Meter, meter_usage
from ..entitlements.deps import get_entitlements
from ..entitlements.matrix import FEATURES, QUOTAS, TIER_ORDER
from ..entitlements.service import Entitlements
from ..schemas.entitlements import (
    EntitlementsResponse,
    MeterUsageResponse,
    PlansResponse,
    TierQuotaResponse,
    TierResponse,
)

router = APIRouter(tags=["entitlements"])


@router.get("/entitlements", response_model=EntitlementsResponse)
def current_entitlements(
    request: Request,
    entitlements: Entitlements = Depends(get_entitlements),
):
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        usage = [meter_usage(session, entitlements, meter) for meter in Meter]

    return EntitlementsResponse(
        organization_id=str(entitlements.organization_id),
        tier=entitlements.tier.value,
        subscription_status=entitlements.subscription_status,
        features=dict(FEATURES.get(entitlements.tier, {})),
        usage=[
            MeterUsageResponse(
                meter=item.meter.value,
                used=item.used,
                limit=item.limit,
                remaining=item.remaining,
                period=item.period,
                exhausted=item.exhausted,
            )
            for item in usage
        ],
    )


@router.get("/plans", response_model=PlansResponse)
def list_plans():
    """The commercial matrix as the server holds it, so an upgrade or pricing
    screen has one source of truth rather than a second copy in TypeScript."""
    return PlansResponse(
        tiers=[
            TierResponse(
                tier=tier.value,
                quotas=[
                    TierQuotaResponse(meter=meter.value, limit=limit)
                    for meter, limit in QUOTAS[tier].items()
                ],
                features=dict(FEATURES.get(tier, {})),
            )
            for tier in TIER_ORDER
        ]
    )
