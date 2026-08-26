"""Commercial enforcement: what a subscription permits, and how much is left.

Nothing in `core/` may import this package. CORE knows how to create an invoice;
this layer decides whether the caller's plan allows the call. See
`matrix.py` for the tier table and `service.py` for the three-concept split
(subscription / entitlement / usage).
"""

from .deps import (
    get_entitlements,
    pdf_branded,
    require_feature,
    require_peppol_quota,
    require_quota,
)
from .errors import EntitlementError, EntitlementRequiredError, UsageLimitReachedError
from .matrix import FEATURES, QUOTAS, Meter, MeterKind
from .service import Entitlements, meter_usage, resolve
from .usage import MeterUsage, current_period

__all__ = [
    "FEATURES",
    "QUOTAS",
    "EntitlementError",
    "EntitlementRequiredError",
    "Entitlements",
    "Meter",
    "MeterKind",
    "MeterUsage",
    "UsageLimitReachedError",
    "current_period",
    "get_entitlements",
    "meter_usage",
    "pdf_branded",
    "require_feature",
    "require_peppol_quota",
    "require_quota",
    "resolve",
]
