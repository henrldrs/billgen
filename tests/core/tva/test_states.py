"""The state machine, and the one property the Loading rule depends on."""

from core.tva import ExpenseState, PeriodState, can_transition, next_states


def test_only_the_three_async_states_are_working():
    working = {s for s in ExpenseState if s.is_working}
    assert working == {
        ExpenseState.PROCESSING,
        ExpenseState.VALIDATING,
        ExpenseState.CLASSIFYING,
    }


def test_terminal_and_empty_states_are_not_working():
    # docs/tva_feature_future.md §12: a completed analysis, an empty list and a
    # failure each get their own state. Any of them showing a spinner is the
    # bug this test exists to catch.
    for state in (ExpenseState.READY, ExpenseState.ANALYZED, ExpenseState.FAILED):
        assert not state.is_working


def test_the_happy_path_is_walkable():
    path = [
        ExpenseState.IMPORTED,
        ExpenseState.PROCESSING,
        ExpenseState.EXTRACTED,
        ExpenseState.VALIDATING,
        ExpenseState.CLASSIFYING,
        ExpenseState.ANALYZED,
        ExpenseState.REVIEWED,
        ExpenseState.RECONCILED,
        ExpenseState.READY,
    ]
    for source, target in zip(path, path[1:], strict=False):
        assert can_transition(source, target)


def test_an_edit_reopens_at_classification_not_at_extraction():
    # Re-running extraction after a user corrected a treatment would discard
    # the correction.
    assert can_transition(ExpenseState.REVIEWED, ExpenseState.CLASSIFYING)
    assert not can_transition(ExpenseState.REVIEWED, ExpenseState.PROCESSING)


def test_every_working_state_can_fail():
    for state in ExpenseState:
        if state.is_working:
            assert ExpenseState.FAILED in next_states(state)


def test_ready_is_terminal():
    assert next_states(ExpenseState.READY) == frozenset()


def test_period_idle_is_the_only_quiet_period_state():
    assert not PeriodState.IDLE.is_working
    assert all(s.is_working for s in PeriodState if s is not PeriodState.IDLE)
