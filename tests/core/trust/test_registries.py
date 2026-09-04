"""The L4 registries assert things about the product, so tests assert them back.

These are not tests of behaviour — there is barely any. They are the mechanism
that stops a compliance statement from quietly going stale: a subprocessor
added without a location, a consent category that defaults to on, an invoice
dataset that someone marks erasable to make a deletion feature easier to write.
Each of those is a legal claim, and each is caught below.
"""

from datetime import date

import pytest

from core.models import AuditAction, AuditLogEntry
from core.trust import ai_transparency, consent, legal, personal_data, security_events

# -- legal -----------------------------------------------------------------


def test_every_legal_document_is_still_undrafted():
    """The one test here that is meant to fail one day.

    When a document is genuinely drafted, this test breaks and whoever drafted
    it updates the count deliberately — which is the moment to also set its
    version and effective date, the two fields a page without a lawyer cannot
    have.
    """
    assert len(legal.documents()) == 7
    assert len(legal.undrafted()) == 7
    assert all(doc.version is None for doc in legal.documents())


def test_an_undrafted_document_is_never_publishable():
    for doc in legal.documents():
        assert not doc.is_publishable


def test_the_two_documents_that_need_acceptance_are_the_contractual_ones():
    """Terms and the DPA bind; the rest inform. Only the binding ones need a
    per-user, per-version acceptance record, and adding a third by accident
    would put a consent gate in front of reading a cookie policy."""
    assert {doc.key for doc in legal.acceptance_required()} == {"terms", "dpa"}


def test_document_lookup_misses_cleanly():
    assert legal.document("terms") is not None
    assert legal.document("not-a-document") is None


# -- consent ---------------------------------------------------------------


def test_nothing_but_essential_defaults_to_on():
    """Pre-ticked boxes are not consent. A future category that forgets to say
    so inherits the safe answer, and this is what proves it."""
    state = consent.default_state()
    assert state[consent.ConsentCategory.ESSENTIAL] is True
    optional = {
        category: value
        for category, value in state.items()
        if category is not consent.ConsentCategory.ESSENTIAL
    }
    assert not any(optional.values())


def test_essential_cannot_be_switched_off():
    state = consent.normalise({"essential": False, "analytics": True})
    assert state[consent.ConsentCategory.ESSENTIAL] is True
    assert state[consent.ConsentCategory.ANALYTICS] is True


def test_an_omitted_category_falls_back_to_off_rather_than_vanishing():
    """A missing key must never read as consent further down the stack."""
    state = consent.normalise({"analytics": True})
    assert state[consent.ConsentCategory.MARKETING] is False
    assert set(state) == {info.category for info in consent.categories()}


def test_an_unknown_category_is_dropped_not_stored():
    state = consent.normalise({"telepathy": True})
    assert "telepathy" not in {c.value for c in state}


def test_only_essential_and_functional_actually_run_anything():
    """The factual claim behind "no banner yet". The day an analytics script is
    added, this test fails and the cookie work becomes due."""
    running = {info.category for info in consent.categories() if info.in_use}
    assert running == {consent.ConsentCategory.ESSENTIAL, consent.ConsentCategory.FUNCTIONAL}


def test_a_decision_records_what_was_consented_to_and_under_which_policy():
    decision = consent.ConsentDecision.taken(
        {"analytics": True}, policy_version="2026-09-04", visitor_id="anon-1"
    )
    assert decision.allows(consent.ConsentCategory.ANALYTICS)
    assert decision.allows(consent.ConsentCategory.ESSENTIAL)
    assert not decision.allows(consent.ConsentCategory.MARKETING)
    assert decision.policy_version == "2026-09-04"


# -- personal data ---------------------------------------------------------


def test_invoices_and_client_contacts_survive_an_erasure_request():
    """Seven years of Belgian bookkeeping retention beats art. 17. A change
    here would turn "delete my account" into a tax offence."""
    retained = {ds.key for ds in personal_data.retained_on_erasure()}
    assert {"invoices", "clients"} <= retained


def test_the_audit_log_is_anonymised_rather_than_erased():
    """The db row carries no FK to users precisely so the trail outlives the
    account. Erasure detaches the actor; it never rewrites history."""
    assert personal_data.dataset("audit").erasure is personal_data.Erasure.ANONYMISE


def test_every_dataset_states_a_basis_and_a_retention():
    for ds in personal_data.register():
        assert ds.retention.strip(), ds.key
        assert ds.purpose.strip(), ds.key


def test_planned_subprocessors_are_not_presented_as_live_ones():
    live = {s.name for s in personal_data.subprocessors(live_only=True)}
    assert live == {"GitHub", "Vercel"}
    assert len(personal_data.subprocessors()) > len(live)


# -- security events -------------------------------------------------------


def _entry(action: AuditAction) -> AuditLogEntry:
    from uuid import uuid4

    return AuditLogEntry(
        organization_id=uuid4(), action=action, target_type="invoice", target_id=uuid4()
    )


def test_an_ordinary_business_mutation_is_not_a_security_event():
    """A log that flags everything says nothing."""
    assert security_events.classify(_entry(AuditAction.ISSUE)) is None
    assert security_events.classify(_entry(AuditAction.PAY)) is None


@pytest.mark.parametrize(
    ("action", "severity"),
    [
        (AuditAction.RESTORE, security_events.SecuritySeverity.WARNING),
        (AuditAction.EXPORT_BACKUP, security_events.SecuritySeverity.NOTICE),
        (AuditAction.LOGIN, security_events.SecuritySeverity.INFO),
    ],
)
def test_exposure_decides_severity(action, severity):
    """A full backup leaving the system is every invoice, client address and
    VAT number in one file — it outranks a sign-in, and a restore outranks it."""
    event = security_events.classify(_entry(action))
    assert event is not None
    assert event.severity is severity


def test_the_only_unwatched_security_action_is_a_failure():
    """One hole left, and it is the important one: nothing records a *failed*
    sign-in, so a hundred wrong passwords in a minute leave no trace. The
    endpoint returns this list so the screen can name its own blind spot rather
    than render an empty table that reads as calm."""
    assert set(security_events.unrecorded()) == {AuditAction.ERROR}


def test_the_credential_actions_the_auth_service_writes_are_classified():
    """These two are written by api/security/auth_service.py as plain strings,
    which is how they stayed out of the enum long enough to break GET /activity
    with a 422. Classifying them here is also what keeps them in the enum."""
    for action in (AuditAction.SESSION_REVOKE, AuditAction.PASSWORD_CHANGE):
        event = security_events.classify(_entry(action))
        assert event is not None, action
        assert event.severity is security_events.SecuritySeverity.NOTICE, action


# -- AI transparency -------------------------------------------------------


def test_every_ai_surface_must_be_marked():
    assert len(ai_transparency.marked_surfaces()) == len(ai_transparency.surfaces())


def test_the_marking_duty_is_read_from_one_date():
    obligation = ai_transparency.TRANSPARENCY_OBLIGATION_DATE
    assert obligation == date(2026, 12, 2)
    assert not ai_transparency.marking_due(date(2026, 12, 1))
    assert ai_transparency.marking_due(date(2026, 12, 2))


def test_the_tva_surfaces_carry_confidence_and_wait_for_a_human():
    """What keeps them out of the high-risk tier: a suggestion nobody confirmed
    has no effect, and the analyzer already sums confirmed and unconfirmed
    recovery separately."""
    for key in ("tva.classification", "tva.extraction"):
        surface = ai_transparency.surface(key)
        assert surface.confidence_field is not None, key
        assert surface.human_confirms, key
        assert surface.risk is ai_transparency.RiskTier.LIMITED, key


def test_no_surface_is_high_risk_and_the_one_that_could_drift_says_how():
    """Annex III covers creditworthiness evaluation of natural persons. Nothing
    here does that; the education surface is the only one capable of drifting
    into it, and it carries the boundary in writing."""
    assert all(s.risk is not ai_transparency.RiskTier.HIGH for s in ai_transparency.surfaces())
    watchlist = {s.key for s in ai_transparency.annex_iii_watchlist()}
    assert watchlist == {"insights.education"}
