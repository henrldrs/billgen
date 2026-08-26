from pydantic import BaseModel


class MeterUsageResponse(BaseModel):
    """One allowance and how much of it is spent.

    `limit: null` means unlimited. `period` is set only for the meters that
    reset monthly (invoices, Peppol documents); the standing totals — clients,
    products, companies, seats — carry `null`.
    """

    meter: str
    used: int
    limit: int | None
    remaining: int | None
    period: str | None
    exhausted: bool


class EntitlementsResponse(BaseModel):
    """Everything the UI needs to render itself correctly for this plan.

    The frontend uses this to hide or badge what the plan does not include. It
    is **not** the enforcement point — every gated endpoint re-checks
    server-side and answers 402. A hidden button is UX; a refused request is
    the rule.
    """

    organization_id: str
    tier: str
    subscription_status: str
    features: dict[str, bool | str]
    usage: list[MeterUsageResponse]


class TierQuotaResponse(BaseModel):
    meter: str
    limit: int | None


class TierResponse(BaseModel):
    tier: str
    quotas: list[TierQuotaResponse]
    features: dict[str, bool | str]


class PlansResponse(BaseModel):
    """The whole commercial matrix, so a pricing or upgrade screen renders from
    the server's table instead of a second copy maintained in TypeScript."""

    tiers: list[TierResponse]
