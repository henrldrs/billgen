"""TVA Intelligence — the expense side of the TVA thread.

**Scaffold. Nothing outside this package imports it.** There is no table, no
migration, no router, no permission and no meter; `api/main.py` is untouched.
See `README.md` in this directory for what integrating it costs and in which
order the pieces have to land.

What is here is the part that can be written correctly without any of that:
the state machine, the domain models, the validation checks, the classification
rules and the aggregation. All of it is pure — no session, no I/O — which is
also what makes the missing half obvious rather than half-wired.
"""

from .analyzer import TreatmentBreakdown, TvaPosition, analyze, exception_queue
from .classification import BELGIAN_CATEGORY_RULES, CategoryRule, classify
from .models import (
    CheckStatus,
    Confidence,
    DocumentCheck,
    Expense,
    ExtractedFields,
    RecoveryTreatment,
    TvaClassification,
)
from .states import ExpenseState, PeriodState, can_transition, next_states
from .validation import duplicate_key, validate, worst_status

__all__ = [
    "BELGIAN_CATEGORY_RULES",
    "CategoryRule",
    "CheckStatus",
    "Confidence",
    "DocumentCheck",
    "Expense",
    "ExpenseState",
    "ExtractedFields",
    "PeriodState",
    "RecoveryTreatment",
    "TreatmentBreakdown",
    "TvaClassification",
    "TvaPosition",
    "analyze",
    "can_transition",
    "classify",
    "duplicate_key",
    "exception_queue",
    "next_states",
    "validate",
    "worst_status",
]
