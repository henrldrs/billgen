"""Aggregation (§6), the exception queue (§7) and period reconciliation (§10).

Scaffold — nothing calls this yet. See README.md.

The analyzer is pure: it takes expenses that have already been classified and
a collected-VAT figure the invoice side owns, and returns totals. It reads no
database and holds no state, which is what makes "recalculate on every edit"
(§6) affordable enough to actually do.

One number is missing on purpose. There is no single `recoverable` total.
`TvaPosition` splits it into `confirmed` and `potential`, because the blueprint's
locked decision is that those are different things — and a period report that
adds them together is a report that files a machine's guesses.
"""

from decimal import Decimal

from pydantic import Field

from core.models._base import DomainModel

from .models import Expense, RecoveryTreatment


class TreatmentBreakdown(DomainModel):
    """Counts and amounts per treatment — the §5 colour blocks, summed."""

    treatment: RecoveryTreatment
    count: int = Field(ge=0)
    detected: Decimal = Decimal("0")
    recoverable: Decimal = Decimal("0")


class TvaPosition(DomainModel):
    """A period's TVA position.

    `estimated_payable` uses `confirmed_recoverable` only. Using the potential
    figure would make the headline number move every time an extractor changed
    its mind, and would present an estimate as a liability.
    """

    expenses_analyzed: int = Field(ge=0)
    detected: Decimal = Decimal("0")
    confirmed_recoverable: Decimal = Decimal("0")
    potential_recoverable: Decimal = Decimal("0")
    review_required: Decimal = Decimal("0")
    non_recoverable: Decimal = Decimal("0")

    collected: Decimal = Decimal("0")
    breakdown: list[TreatmentBreakdown] = Field(default_factory=list)

    unresolved_exceptions: int = Field(default=0, ge=0)

    @property
    def estimated_payable(self) -> Decimal:
        return self.collected - self.confirmed_recoverable

    @property
    def is_complete(self) -> bool:
        """§11's gate. The export CTA is unavailable while this is False."""
        return self.unresolved_exceptions == 0


def analyze(expenses: list[Expense], *, collected: Decimal = Decimal("0")) -> TvaPosition:
    """Roll a list of classified expenses into one position."""
    per_treatment: dict[RecoveryTreatment, TreatmentBreakdown] = {
        treatment: TreatmentBreakdown(treatment=treatment, count=0)
        for treatment in RecoveryTreatment
    }

    detected = Decimal("0")
    confirmed = Decimal("0")
    potential = Decimal("0")
    review = Decimal("0")
    non_recoverable = Decimal("0")
    analyzed = 0

    for expense in expenses:
        classification = expense.classification
        if classification is None:
            # Still in the pipeline. Counting it would make the total move
            # while a spinner is on screen for a reason unrelated to it.
            continue

        analyzed += 1
        detected += classification.detected_amount

        row = per_treatment[classification.treatment]
        row.count += 1
        row.detected += classification.detected_amount
        row.recoverable += classification.recoverable_amount

        if classification.treatment is RecoveryTreatment.REVIEW_REQUIRED:
            review += classification.detected_amount
        elif classification.treatment is RecoveryTreatment.NON_RECOVERABLE:
            non_recoverable += classification.detected_amount

        if classification.is_confirmed:
            confirmed += classification.recoverable_amount
        else:
            potential += classification.recoverable_amount

    return TvaPosition(
        expenses_analyzed=analyzed,
        detected=detected,
        confirmed_recoverable=confirmed,
        potential_recoverable=potential,
        review_required=review,
        non_recoverable=non_recoverable,
        collected=collected,
        breakdown=[row for row in per_treatment.values() if row.count],
        unresolved_exceptions=sum(1 for e in expenses if e.needs_attention),
    )


def exception_queue(expenses: list[Expense]) -> list[Expense]:
    """The work queue (§6), worst first.

    Ordering is by amount at risk, not by date. The point of the queue is that
    the user stops hunting; a chronological list of seven items is still a hunt
    when only one of them is worth €105.
    """
    flagged = [e for e in expenses if e.needs_attention]
    return sorted(
        flagged,
        key=lambda e: e.classification.detected_amount if e.classification else Decimal("0"),
        reverse=True,
    )
