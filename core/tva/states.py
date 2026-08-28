"""The TVA thread's state machine, and the one rule the UI reads off it.

Scaffold — nothing in `api/` or `db/` imports this yet. See README.md.

`docs/tva_feature_future.md` §13 asks for the UI to be driven by explicit
states rather than scattered booleans, and §12 turns that into a product rule:
the Loading component appears for *active background work* and for nothing
else. An empty list, a completed analysis, an error and a permission refusal
each get their own state — showing a spinner for any of them tells the user
something false.

Those two asks are the same fact written twice, so they are one thing here:
`ExpenseState.is_working` is the single predicate the frontend consumes, and
the frontend never re-derives it from a set of status strings of its own.
"""

from enum import Enum


class ExpenseState(str, Enum):
    """Where one imported document is in the pipeline.

    The terminal treatments (RECOVERABLE … REVIEW_REQUIRED) are deliberately
    *not* states here — a treatment is a property of the classification, and
    an expense can carry one while still being un-reviewed. Conflating them
    would make "analyzed but not yet accepted by a human" unrepresentable,
    which is precisely the distinction §5 exists to protect.
    """

    IMPORTED = "imported"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    VALIDATING = "validating"
    CLASSIFYING = "classifying"
    ANALYZED = "analyzed"
    REVIEWED = "reviewed"
    RECONCILED = "reconciled"
    READY = "ready"
    FAILED = "failed"

    @property
    def is_working(self) -> bool:
        """True when the server is actively doing something to this expense.

        The frontend's Loading rule (§12) is this property and no other check.
        """
        return self in _WORKING


class PeriodState(str, Enum):
    """The period-level counterpart. Same Loading rule, different subject."""

    IDLE = "idle"
    RECALCULATING = "recalculating"
    RECONCILING = "reconciling"
    EXPORTING = "exporting"

    @property
    def is_working(self) -> bool:
        return self is not PeriodState.IDLE


_WORKING: frozenset[ExpenseState] = frozenset(
    {
        ExpenseState.PROCESSING,
        ExpenseState.VALIDATING,
        ExpenseState.CLASSIFYING,
    }
)

# The forward edges. FAILED is reachable from every working state, so it is
# added below rather than repeated four times.
_TRANSITIONS: dict[ExpenseState, frozenset[ExpenseState]] = {
    ExpenseState.IMPORTED: frozenset({ExpenseState.PROCESSING}),
    ExpenseState.PROCESSING: frozenset({ExpenseState.EXTRACTED}),
    ExpenseState.EXTRACTED: frozenset({ExpenseState.VALIDATING}),
    ExpenseState.VALIDATING: frozenset({ExpenseState.CLASSIFYING}),
    ExpenseState.CLASSIFYING: frozenset({ExpenseState.ANALYZED}),
    # A user edit re-opens the pipeline at classification: §6 requires a
    # recalculation whenever a treatment or a deductible percentage changes,
    # and re-running extraction there would discard the correction.
    ExpenseState.ANALYZED: frozenset({ExpenseState.REVIEWED, ExpenseState.CLASSIFYING}),
    ExpenseState.REVIEWED: frozenset({ExpenseState.RECONCILED, ExpenseState.CLASSIFYING}),
    ExpenseState.RECONCILED: frozenset({ExpenseState.READY, ExpenseState.CLASSIFYING}),
    ExpenseState.READY: frozenset(),
    # A failed extraction is retried from the top; the document is unchanged.
    ExpenseState.FAILED: frozenset({ExpenseState.PROCESSING}),
}

for _working in _WORKING:
    _TRANSITIONS[_working] = _TRANSITIONS[_working] | {ExpenseState.FAILED}


def can_transition(source: ExpenseState, target: ExpenseState) -> bool:
    return target in _TRANSITIONS[source]


def next_states(source: ExpenseState) -> frozenset[ExpenseState]:
    return _TRANSITIONS[source]
