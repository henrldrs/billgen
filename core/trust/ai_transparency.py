"""AI Act transparency — which outputs are machine-made, and must say so.

Two rules from the EU AI Act land on this product, and they land in opposite
places.

**Marking (art. 50).** Output produced by a model has to be identifiable as
such. The date Henri is working to is **2 December 2026** — see
`TRANSPARENCY_OBLIGATION_DATE` below and the caveat on it. That is roughly
three months out, and the cost curve is the whole reason this module exists
now rather than then: `confidence` and the reason codes already ride along with
every TVA suggestion (`core/tva/models.py`), so marking is a rendering decision
today and a migration across every AI surface later.

**Classification (Annex III).** Creditworthiness evaluation of a natural person
is high-risk. Nothing in BillGen does that, and the registry below is where it
stays true: any surface that starts scoring a person's *financial standing* —
rather than explaining, budgeting or educating — has crossed into Annex III and
needs a conformity assessment, not a disclosure banner. `crosses_annex_iii`
records the specific drift each surface is capable of, so the boundary is
reviewed per feature instead of remembered.

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
    HIGH = "high"        # Annex III — none of BillGen is here, and that is the point


#  The date the marking obligation is being planned against.
#
#  Sourced from Henri's compliance note, not from the Official Journal. Confirm
#  it against the published text before it is quoted to a customer or written
#  into the privacy policy — a date in a compliance banner is a factual claim,
#  and this constant exists so there is exactly one place to correct.
TRANSPARENCY_OBLIGATION_DATE = date(2026, 12, 2)


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
    """
    return (today or date.today()) >= TRANSPARENCY_OBLIGATION_DATE


def annex_iii_watchlist() -> tuple[AiSurface, ...]:
    """Surfaces with a named way to become high-risk. Review these per release."""
    return tuple(s for s in SURFACES if s.crosses_annex_iii is not None)
