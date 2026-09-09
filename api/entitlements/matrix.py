"""What each plan tier is allowed to do — the commercial matrix, as data.

This module is the *only* place a tier name maps to a capability. Nothing in
`core/` may import it: CORE knows how to create an invoice, and this layer
decides whether the caller's subscription permits the call. That separation is
what lets a price change or a quota change ship without touching domain code.

Two kinds of limit, and the difference matters:

- **Flow** metrics reset every calendar month (invoices, Peppol documents).
  "50 invoices" means fifty per month.
- **Stock** metrics are a standing total (clients, products, companies, seats).
  "100 clients" means a hundred on the books, not a hundred per month.

`None` as a limit means unlimited. A missing feature key means "not included".
"""

from __future__ import annotations

from enum import Enum

from core.models import PlanTier


class MeterKind(str, Enum):
    FLOW = "flow"
    STOCK = "stock"


class Meter(str, Enum):
    """A countable resource. The value is the wire name used in a 402 body."""

    INVOICES = "invoices"
    CLIENTS = "clients"
    PRODUCTS = "products"
    COMPANIES = "companies"
    SEATS = "seats"
    PEPPOL_DOCUMENTS = "peppol_documents"


METER_KINDS: dict[Meter, MeterKind] = {
    Meter.INVOICES: MeterKind.FLOW,
    Meter.PEPPOL_DOCUMENTS: MeterKind.FLOW,
    Meter.CLIENTS: MeterKind.STOCK,
    Meter.PRODUCTS: MeterKind.STOCK,
    Meter.COMPANIES: MeterKind.STOCK,
    Meter.SEATS: MeterKind.STOCK,
}


# Feature flags and graded features. A graded value ("basic"/"full"/"advanced")
# is read by the frontend to pick a variant; the backend only enforces the
# boolean ones and the meters above.
QUOTAS: dict[PlanTier, dict[Meter, int | None]] = {
    PlanTier.FREE: {
        Meter.INVOICES: 10,
        Meter.CLIENTS: 10,
        Meter.PRODUCTS: 10,
        Meter.COMPANIES: 1,
        Meter.SEATS: 1,
        Meter.PEPPOL_DOCUMENTS: 5,
    },
    PlanTier.STARTER: {
        Meter.INVOICES: 50,
        Meter.CLIENTS: 100,
        Meter.PRODUCTS: 100,
        Meter.COMPANIES: 1,
        Meter.SEATS: 1,
        Meter.PEPPOL_DOCUMENTS: 30,
    },
    PlanTier.BUSINESS: {
        Meter.INVOICES: 250,
        Meter.CLIENTS: 1000,
        Meter.PRODUCTS: 1000,
        Meter.COMPANIES: 3,
        Meter.SEATS: 3,
        Meter.PEPPOL_DOCUMENTS: 100,
    },
    PlanTier.BUSINESS_PRO: {
        Meter.INVOICES: 1000,
        Meter.CLIENTS: None,
        Meter.PRODUCTS: None,
        Meter.COMPANIES: 10,
        Meter.SEATS: 10,
        Meter.PEPPOL_DOCUMENTS: 500,
    },
}


FEATURES: dict[PlanTier, dict[str, bool | str]] = {
    PlanTier.FREE: {
        # Credit notes, PDF export, backup, restore and legacy import are on
        # every tier on purpose. Correcting an invoice and owning your own data
        # are not upsells — see the pricing note in docs.
        "credit_notes": True,
        "pdf_export": True,
        "backup_export": True,
        "backup_restore": True,
        "backup_automatic": False,
        "backup_scheduled": False,
        "backup_history": False,
        "import_legacy": "basic",
        "pdf_remove_branding": False,
        "pdf_templates_premium": False,
        "pdf_customization": "basic",
        "peppol_export": True,
        "vat_report": "basic",
        "dashboard": "basic",
        "search": "basic",
        "audit_history": "basic",
        "payment_tracking": "basic",
        "recurring_invoices": False,
        "accountant_export": False,
        "multi_company": False,
        "company_level_settings": False,
        "roles_permissions": False,
        "team_administration": False,
        "priority_support": False,
    },
    PlanTier.STARTER: {
        "credit_notes": True,
        "pdf_export": True,
        "backup_export": True,
        "backup_restore": True,
        "backup_automatic": True,
        "backup_scheduled": False,
        "backup_history": False,
        "import_legacy": "full",
        "pdf_remove_branding": True,
        "pdf_templates_premium": False,
        "pdf_customization": "standard",
        "peppol_export": True,
        "vat_report": "full",
        "dashboard": "standard",
        "search": "full",
        "audit_history": "full",
        "payment_tracking": "full",
        "recurring_invoices": True,
        "accountant_export": "csv",
        "multi_company": False,
        "company_level_settings": False,
        "roles_permissions": False,
        "team_administration": False,
        "priority_support": False,
    },
    PlanTier.BUSINESS: {
        "credit_notes": True,
        "pdf_export": True,
        "backup_export": True,
        "backup_restore": True,
        "backup_automatic": True,
        "backup_scheduled": True,
        "backup_history": True,
        "import_legacy": "full",
        "pdf_remove_branding": True,
        "pdf_templates_premium": True,
        "pdf_customization": "advanced",
        "peppol_export": True,
        "vat_report": "advanced",
        "dashboard": "advanced",
        "search": "full",
        "audit_history": "full",
        "payment_tracking": "full",
        "recurring_invoices": True,
        "accountant_export": "structured",
        "multi_company": True,
        "company_level_settings": True,
        "roles_permissions": True,
        # Business has seats and roles, but stays a single-owner workspace: the
        # administration surface is Business Pro's.
        "team_administration": False,
        "priority_support": True,
    },
    PlanTier.BUSINESS_PRO: {
        "credit_notes": True,
        "pdf_export": True,
        "backup_export": True,
        "backup_restore": True,
        "backup_automatic": True,
        "backup_scheduled": True,
        "backup_history": True,
        "import_legacy": "advanced",
        "pdf_remove_branding": True,
        "pdf_templates_premium": True,
        "pdf_customization": "custom",
        "peppol_export": True,
        # Not "advanced" like Business: the top tier's VAT story is the
        # consolidated, multi-company view the billing owner sees across every
        # entity under their subscription.
        "vat_report": "consolidated",
        "dashboard": "advanced",
        "search": "advanced",
        "audit_history": "full",
        "payment_tracking": "full",
        "recurring_invoices": True,
        "accountant_export": "full",
        "multi_company": True,
        "company_level_settings": True,
        "roles_permissions": "advanced",
        # What the top tier actually is: one bill covering several people,
        # instead of each of them holding their own subscription. The billing
        # owner gets an administration surface — seats, per-entity usage,
        # consolidated reporting — that a single-user plan has no use for.
        # The shell that renders it is unbuilt; see docs/SOLO_RUN.md,
        # § Open decisions parked for him.
        "team_administration": True,
        "priority_support": "priority",
    },
}


# Which tier is the cheapest that includes a given feature — the `required_tier`
# a 402 hands back so the upgrade modal can name the right plan.
TIER_ORDER: list[PlanTier] = [
    PlanTier.FREE,
    PlanTier.STARTER,
    PlanTier.BUSINESS,
    PlanTier.BUSINESS_PRO,
]


def cheapest_tier_with(feature: str) -> PlanTier | None:
    """The lowest tier where `feature` is truthy, or None if no tier has it."""
    for tier in TIER_ORDER:
        if FEATURES.get(tier, {}).get(feature):
            return tier
    return None


def cheapest_tier_over(meter: Meter, needed: int) -> PlanTier | None:
    """The lowest tier whose quota for `meter` admits `needed` units."""
    for tier in TIER_ORDER:
        limit = QUOTAS[tier].get(meter)
        if limit is None or limit >= needed:
            return tier
    return None
