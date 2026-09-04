"""AI Act transparency — which outputs are machine-made, and must say so.

Two rules from the EU AI Act land on this product, and they land in opposite
places.

**Marking (art. 50).** Output produced by a model has to be identifiable as
such. This module used to plan against **2 December 2026**, on a caveat that
asked for the date to be checked against the published text. It was checked
(2026-09-04, ADR-0005) and it was wrong for this product: 2 December is the end
of a *grace period that BillGen does not qualify for*. The obligation has been
live since **2 August 2026**. See the constants below, which now record the
derivation rather than a single number, and `docs/ARCHITECTURE/ADR-0005`.

The cost curve is still the reason this module exists: `confidence` and the
reason codes already ride along with every TVA suggestion
(`core/tva/models.py`), so marking is a rendering decision today and a
migration across every AI surface later. What changed is that it is no longer a
decision with three months of runway in front of it.

**Classification (Annex III).** Creditworthiness evaluation of a natural person
is high-risk. Nothing in BillGen does that, and the registry below is where it
stays true: any surface that starts scoring a person's *financial standing* —
rather than explaining, budgeting or educating — has crossed into Annex III and
needs a conformity assessment, not a disclosure banner. `crosses_annex_iii`
records the specific drift each surface is capable of, so the boundary is
reviewed per feature instead of remembered.

**What this module is not.** It is a registry of *product surfaces*, not the
Article 4 **AI system inventory**. Article 4 asks a different set of questions —
which model, which pinned version, whose model, where inference runs, what data
crosses the boundary, who was trained on what — and none of them have a column
here. That inventory does not exist yet; it is item **I4** in
`docs/MINIMAL_STACK.md`. Article 4 has also been enforceable since 2 August
2026, and applies at *every* risk tier, so a page full of minimal-risk surfaces
does not discharge it.

Nothing here calls a model. This is the ledger the UI and the reviewers read.
"""

from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel


class RiskTier(str, Enum):
    """The AI Act's tiers, as they apply to a surface in this product."""

    MINIMAL = "minimal"
    LIMITED = "limited"  # transparency obligations attach
    HIGH = "high"  # Annex III — none of BillGen is here, and that is the point


#  Article 50 transparency became applicable on this date. It is not a deadline
#  BillGen is approaching; it is a date that has passed.
TRANSPARENCY_APPLICABLE_FROM = date(2026, 8, 2)

#  The end of the watermarking grace period. This is the 2 December 2026 that
#  the module previously treated as its own deadline, and the correction is what
#  the date *attaches to*: the grace period covers systems already placed on the
#  market before TRANSPARENCY_APPLICABLE_FROM. It is kept as a named constant
#  precisely so nobody reads it off a compliance summary again and concludes it
#  applies here.
WATERMARK_GRACE_END = date(2026, 12, 2)

#  Was BillGen on the market before the obligation applied? No — the pre-sale
#  beta had not shipped on 2 August 2026. So the grace period does not apply,
#  and the transparency layer has to be in the *first* shipped version rather
#  than added as a fast-follow. One boolean, because the whole correction turns
#  on it.
PLACED_ON_MARKET_BEFORE_OBLIGATION = False

#: The date this product's marking duty actually starts. Derived, not asserted,
#: so the reasoning stays next to the number — a date in a compliance banner is
#: a factual claim, and this is the one place to correct it.
#:
#: Verified 2026-09-04 against the consolidated reading in ADR-0005. The earlier
#: value (2026-12-02) came from a vendor compliance note and was the grace-period
#: end, misread as the obligation date.
TRANSPARENCY_OBLIGATION_DATE = (
    WATERMARK_GRACE_END if PLACED_ON_MARKET_BEFORE_OBLIGATION else TRANSPARENCY_APPLICABLE_FROM
)


class AiSurface(BaseModel):
    """One place in BillGen where a machine produces something a person reads."""

    key: str
    label: str
    #  What it emits, in the user's terms — not the model's.
    produces: str
    module: str
    risk: RiskTier
    #  The field already carrying the machine's own uncertainty. Marking is
    #  cheap precisely because these exist; a surface with `None` here needs one
    #  before it can be disclosed honestly.
    confidence_field: str | None = None
    #  Does a person have to confirm before the output has any effect? This is
    #  the difference between a suggestion and a decision, and it is what keeps
    #  every surface below out of the high-risk tier.
    human_confirms: bool = True
    #  Must the output be visibly marked as machine-generated?
    requires_marking: bool = True
    #  The specific way this surface could drift into Annex III, if it can.
    crosses_annex_iii: str | None = None
    note: str | None = None


SURFACES: tuple[AiSurface, ...] = (
    AiSurface(
        key="tva.classification",
        label="TVA recovery suggestion",
        produces="A proposed VAT treatment for an expense, with a deductible percentage.",
        module="core.tva.classification",
        risk=RiskTier.LIMITED,
        confidence_field="TvaClassification.confidence",
        human_confirms=True,
        requires_marking=True,
        note=(
            "Already built for this: `recoverable_amount` stays *potentially* "
            "recoverable until `confirmed_at` is set, and the analyzer sums the "
            "two separately, so a period total can never quietly include a "
            "machine guess. Marking is the visual half of a separation the "
            "domain already enforces."
        ),
    ),
    AiSurface(
        key="tva.extraction",
        label="Document field extraction",
        produces="Supplier, dates, amounts and VAT read off a scanned expense document.",
        module="core.tva.models.ExtractedFields",
        risk=RiskTier.LIMITED,
        confidence_field="ExtractedFields.field_confidence",
        human_confirms=True,
        requires_marking=True,
        note=(
            "Per-field confidence already drives the evidence panel's ticks. "
            "Marking here means the field itself carries the flag, not the "
            "screen — a person editing one extracted value must see which of "
            "the others are still machine-read."
        ),
    ),
    AiSurface(
        key="insights.education",
        label="Budgeting and explanatory guidance",
        produces="Plain-language explanation of a figure the app already computed.",
        module="not yet built",
        risk=RiskTier.MINIMAL,
        confidence_field=None,
        human_confirms=False,
        requires_marking=True,
        crosses_annex_iii=(
            "The moment it scores the financial standing of a natural person "
            "rather than explaining a number, it is creditworthiness "
            "evaluation under Annex III and needs a conformity assessment. "
            "Keep every output framed as education, never as assessment: no "
            "score, no rating, no eligibility verdict about a person."
        ),
        note=(
            "Minimal-risk by framing, not by accident. This is the one surface "
            "on the roadmap capable of drifting, which is why it is listed "
            "before it is built."
        ),
    ),
)

_BY_KEY = {surface.key: surface for surface in SURFACES}


def surfaces() -> tuple[AiSurface, ...]:
    return SURFACES


def surface(key: str) -> AiSurface | None:
    return _BY_KEY.get(key)


def marked_surfaces() -> tuple[AiSurface, ...]:
    """Everything that has to render a machine-generated marker."""
    return tuple(s for s in SURFACES if s.requires_marking)


def marking_due(today: date | None = None) -> bool:
    """Is the marking obligation live yet?

    Answered as a function rather than read as a constant so the UI can show a
    countdown before the date and an obligation after it, from one source. Note
    that BillGen intends to mark regardless — this decides the wording of the
    warning in the trust screen, not whether the marker is drawn.

    Since the correction in ADR-0005 this returns True for every real `today`.
    The countdown branch is dead for this product and is kept only because the
    function is honest about the general case; the screen it feeds should now
    read as an obligation, never as a deadline.
    """
    return (today or date.today()) >= TRANSPARENCY_OBLIGATION_DATE


def annex_iii_watchlist() -> tuple[AiSurface, ...]:
    """Surfaces with a named way to become high-risk. Review these per release."""
    return tuple(s for s in SURFACES if s.crosses_annex_iii is not None)
