"""BillGen's own legal paperwork, as a registry rather than as pages.

Seven documents decide whether BillGen can be sold to a business: terms,
privacy policy, cookie policy, DPA, subprocessor list, SLA and the legal
notices Belgian law requires on the site itself. None of them is drafted.

**This module deliberately holds no legal text.** A generated DPA that reads
like a real one is worse than a missing one — it would be signed. What it holds
is the *ledger*: which documents exist, which are still undrafted, which need a
per-user acceptance record, and what each one blocks while it is missing. That
is the part engineering owns; the prose is a lawyer's, and the registry is what
tells you which lawyer's paragraph is still outstanding.

The same registry serves two surfaces (ROADMAP_IA §5, "write once, mount
twice"): the customer app behind auth, and the public marketing site. That is
why `GET /legal/documents` is on the public allowlist in
`api/middleware/tenant.py` — a visitor who has not signed up must still be able
to read the privacy policy.
"""

from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class Audience(str, Enum):
    """Who has to be able to read the document without signing in."""

    PUBLIC = "public"       # marketing site + app; no session required
    CUSTOMER = "customer"   # inside the app, behind auth


class LegalDocument(BaseModel):
    """One document in BillGen's legal framework.

    `version` and `effective_date` are `None` until the document is drafted,
    and that is the honest encoding: a version number on an undrafted document
    is the exact lie this registry exists to prevent.
    """

    key: str = Field(min_length=1, max_length=32)
    title: str
    #  Where the app routes it — the IA node's path, so a screen and a document
    #  can never drift apart silently.
    ia_path: str
    audience: Audience
    #  A per-user, per-version acceptance record is required. Only the terms and
    #  the DPA carry legal weight from being *accepted*; the rest are notices.
    requires_acceptance: bool = False
    drafted: bool = False
    version: str | None = None
    effective_date: date | None = None
    #  What stays blocked while this is undrafted. Prose, because the reader is
    #  deciding what to commission from a lawyer first.
    blocks: tuple[str, ...] = ()
    note: str | None = None

    @property
    def is_publishable(self) -> bool:
        return self.drafted and self.version is not None


#  Ordered by what unblocks the most revenue first, not alphabetically. The DPA
#  is third because no Belgian business customer's DPO signs without one, and
#  the notices are last only because they are the cheapest — an hour of copying
#  the KBO record, not a drafting engagement.
DOCUMENTS: tuple[LegalDocument, ...] = (
    LegalDocument(
        key="terms",
        title="Terms of Service",
        ia_path="legal/terms",
        audience=Audience.PUBLIC,
        requires_acceptance=True,
        blocks=("charging money", "any paid signup"),
        note=(
            "Needs a version and a per-user acceptance record, not just a page: "
            "a term nobody can prove was shown is a term you do not have."
        ),
    ),
    LegalDocument(
        key="privacy",
        title="Privacy Policy",
        ia_path="legal/privacy",
        audience=Audience.PUBLIC,
        blocks=("collecting an email address on the marketing site",),
        note="Must match the processing register in core.trust.personal_data, field for field.",
    ),
    LegalDocument(
        key="dpa",
        title="Data Processing Agreement",
        ia_path="legal/dpa",
        audience=Audience.CUSTOMER,
        requires_acceptance=True,
        blocks=("selling to any business with a DPO",),
        note=(
            "BillGen is the processor and the customer the controller: their "
            "clients' names and addresses are on every invoice. Needs a "
            "countersignature flow, and it names the subprocessor list below."
        ),
    ),
    LegalDocument(
        key="subprocessors",
        title="Subprocessors",
        ia_path="legal/subprocessors",
        audience=Audience.PUBLIC,
        blocks=("the DPA, which has to reference it",),
        note=(
            "A list is not enough — the DPA has to promise notification before "
            "a new subprocessor is added, which makes this a maintained page "
            "with a change history, not a static one."
        ),
    ),
    LegalDocument(
        key="cookies",
        title="Cookie Policy",
        ia_path="legal/cookies",
        audience=Audience.PUBLIC,
        blocks=("running any analytics at all",),
        note=(
            "Cheap today only because nothing analytic runs: the categories in "
            "core.trust.consent are all essential. The day one script is added "
            "this becomes a live compliance gap, not a document."
        ),
    ),
    LegalDocument(
        key="sla",
        title="Service Level Agreement",
        ia_path="legal/sla",
        audience=Audience.CUSTOMER,
        blocks=("enterprise tiers that ask for one",),
        note=(
            "Do not draft before uptime is measured. An SLA is a promise about "
            "a number nobody is recording — /healthz answers a request, it does "
            "not accumulate availability."
        ),
    ),
    LegalDocument(
        key="notices",
        title="Legal notices",
        ia_path="legal/notices",
        audience=Audience.PUBLIC,
        blocks=("publishing the marketing site lawfully",),
        note=(
            "Legal entity, KBO/BCE number, registered address and contact. "
            "Belgian law requires these on the site itself — the cheapest "
            "document here and the only one already overdue, because the "
            "pre-sale site is live."
        ),
    ),
)

_BY_KEY = {doc.key: doc for doc in DOCUMENTS}


def documents() -> tuple[LegalDocument, ...]:
    return DOCUMENTS


def document(key: str) -> LegalDocument | None:
    return _BY_KEY.get(key)


def undrafted() -> tuple[LegalDocument, ...]:
    """Everything still outstanding — today, all seven."""
    return tuple(doc for doc in DOCUMENTS if not doc.drafted)


def acceptance_required() -> tuple[LegalDocument, ...]:
    """The documents a signup flow has to record consent to, once drafted."""
    return tuple(doc for doc in DOCUMENTS if doc.requires_acceptance)
