"""L4 — Trust. The registries the compliance surfaces read from.

Five modules, no database and no I/O. That is deliberate: every one of these is
a *statement about the product* — which legal documents exist, what personal
data is held and for how long, which cookies run, which audit actions count as
security events, which outputs a machine produced. Statements of that kind rot
when they live in a document nobody opens, and they are cheap to keep true when
a test can assert them.

Deliberately a sibling of `core/services`, not a member of it. A service takes a
unit of work and mutates something; nothing here does. Keeping the split visible
also keeps `core/services/__init__.py` out of the way of whoever is editing it.

The gaps these modules leave are named where they are — consent has no storage,
the legal documents have no text, the security screen has three actions nothing
writes — because a registry that hides its own holes is worse than no registry.
"""

from .ai_transparency import (
    TRANSPARENCY_OBLIGATION_DATE,
    AiSurface,
    RiskTier,
    annex_iii_watchlist,
    marked_surfaces,
    marking_due,
    surface,
    surfaces,
)
from .consent import (
    CATEGORIES,
    CategoryInfo,
    ConsentCategory,
    ConsentDecision,
    categories,
    category_info,
    default_state,
    normalise,
)
from .legal import (
    DOCUMENTS,
    Audience,
    LegalDocument,
    acceptance_required,
    document,
    documents,
    undrafted,
)
from .personal_data import (
    REGISTER,
    SUBPROCESSORS,
    DataSet,
    Erasure,
    LawfulBasis,
    Subprocessor,
    dataset,
    exportable,
    register,
    retained_on_erasure,
    subprocessors,
)
from .security_events import (
    SECURITY_ACTIONS,
    SecurityEvent,
    SecurityEventKind,
    SecuritySeverity,
    classify,
    is_security_event,
    unrecorded,
)

__all__ = [
    "CATEGORIES",
    "DOCUMENTS",
    "REGISTER",
    "SECURITY_ACTIONS",
    "SUBPROCESSORS",
    "TRANSPARENCY_OBLIGATION_DATE",
    "AiSurface",
    "Audience",
    "CategoryInfo",
    "ConsentCategory",
    "ConsentDecision",
    "DataSet",
    "Erasure",
    "LawfulBasis",
    "LegalDocument",
    "RiskTier",
    "SecurityEvent",
    "SecurityEventKind",
    "SecuritySeverity",
    "Subprocessor",
    "acceptance_required",
    "annex_iii_watchlist",
    "categories",
    "category_info",
    "classify",
    "dataset",
    "default_state",
    "document",
    "documents",
    "exportable",
    "is_security_event",
    "marked_surfaces",
    "marking_due",
    "normalise",
    "register",
    "retained_on_erasure",
    "subprocessors",
    "surface",
    "surfaces",
    "undrafted",
    "unrecorded",
]
