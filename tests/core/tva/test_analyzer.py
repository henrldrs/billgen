"""Aggregation — and the split the period report is not allowed to collapse."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

from core.tva import (
    Confidence,
    Expense,
    ExpenseState,
    RecoveryTreatment,
    TvaClassification,
    analyze,
    exception_queue,
)

ORG = uuid4()
COMPANY = uuid4()


def _expense(
    treatment: RecoveryTreatment,
    detected: str,
    recoverable: str = "0",
    *,
    confirmed: bool = False,
    state: ExpenseState = ExpenseState.ANALYZED,
) -> Expense:
    return Expense(
        organization_id=ORG,
        company_id=COMPANY,
        state=state,
        classification=TvaClassification(
            treatment=treatment,
            confidence=Confidence.HIGH,
            detected_amount=Decimal(detected),
            recoverable_amount=Decimal(recoverable),
            confirmed_at=datetime.now(UTC) if confirmed else None,
        ),
    )


def test_potential_and_confirmed_recovery_are_counted_apart():
    position = analyze(
        [
            _expense(RecoveryTreatment.RECOVERABLE, "21.00", "21.00", confirmed=True),
            _expense(RecoveryTreatment.RECOVERABLE, "42.00", "42.00"),
        ]
    )
    assert position.confirmed_recoverable == Decimal("21.00")
    assert position.potential_recoverable == Decimal("42.00")


def test_estimated_payable_uses_only_confirmed_recovery():
    # A machine's guess must not reduce a declared liability.
    position = analyze(
        [_expense(RecoveryTreatment.RECOVERABLE, "42.00", "42.00")],
        collected=Decimal("1000.00"),
    )
    assert position.estimated_payable == Decimal("1000.00")


def test_an_unclassified_expense_does_not_move_the_totals():
    position = analyze(
        [
            _expense(RecoveryTreatment.RECOVERABLE, "21.00", "21.00", confirmed=True),
            Expense(organization_id=ORG, company_id=COMPANY, state=ExpenseState.PROCESSING),
        ]
    )
    assert position.expenses_analyzed == 1
    assert position.detected == Decimal("21.00")


def test_review_required_blocks_completion():
    position = analyze([_expense(RecoveryTreatment.REVIEW_REQUIRED, "60.00")])
    assert position.unresolved_exceptions == 1
    assert not position.is_complete


def test_a_period_with_nothing_flagged_is_complete():
    position = analyze([_expense(RecoveryTreatment.NON_RECOVERABLE, "21.00")])
    assert position.is_complete


def test_the_breakdown_omits_treatments_nothing_landed_in():
    position = analyze([_expense(RecoveryTreatment.NON_RECOVERABLE, "21.00")])
    assert [row.treatment for row in position.breakdown] == [RecoveryTreatment.NON_RECOVERABLE]


def test_the_queue_is_ordered_by_money_at_risk_not_by_date():
    small = _expense(RecoveryTreatment.REVIEW_REQUIRED, "42.00")
    large = _expense(RecoveryTreatment.REVIEW_REQUIRED, "105.00")
    assert exception_queue([small, large]) == [large, small]


def test_the_position_has_no_single_recoverable_total():
    # The blueprint's locked decision, enforced by absence: a report that adds
    # confirmed and potential together files a machine's guesses.
    position = analyze([])
    with pytest.raises(AttributeError):
        _ = position.recoverable  # type: ignore[attr-defined]
