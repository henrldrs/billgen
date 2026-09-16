"""The register of processing — what personal data BillGen holds, and why.

GDPR art. 30 requires this as a document. Writing it as data instead buys three
things a Word file cannot: the privacy screen renders from it, a subject-access
export knows which datasets to walk, and an erasure request can be answered
*correctly* — which usually means refused in part, because an issued invoice is
a document Belgian tax law obliges the company to keep for seven years and no
data subject can override that.

That last point is the one worth encoding. "Delete my account" implemented as
`DELETE FROM` is a tax offence. The register is where the retention conflict
lives, so the deletion workflow can read it rather than rediscover it.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class LawfulBasis(str, Enum):
    CONTRACT = "contract"                          # art. 6(1)(b)
    LEGAL_OBLIGATION = "legal_obligation"          # art. 6(1)(c)
    LEGITIMATE_INTEREST = "legitimate_interest"    # art. 6(1)(f)
    CONSENT = "consent"                            # art. 6(1)(a)


class Erasure(str, Enum):
    """What actually happens to a dataset on an erasure request."""

    ERASE = "erase"          # deleted outright
    ANONYMISE = "anonymise"  # the record survives, the person does not
    RETAIN = "retain"        # legally obliged to keep, request refused in part


class DataSet(BaseModel):
    """One category of personal data, and every rule that applies to it."""

    key: str
    label: str
    #  Whose data it is. Most of it is not the customer's own but their
    #  clients' — and what that makes BillGen depends on the deployment shape
    #  (BETA_LAUNCH_PLAN, 2026-09-09; T-36). Hosted, BillGen is a processor of
    #  the customer's clients' data and the DPA is required (core.trust.legal).
    #  On the desktop the data never leaves the customer's machine: the
    #  customer is the controller and BillGen is a software supplier, so the
    #  DPA is out of scope — except for support, when a backup sent for a
    #  diagnosis makes us a processor for that one act (LEGAL_BRIEF Q6).
    subject: str
    fields: tuple[str, ...]
    purpose: str
    basis: LawfulBasis
    retention: str
    #  Included in a GDPR subject-access export.
    exportable: bool = True
    erasure: Erasure = Erasure.ERASE
    #  Where it lives, so the export walker has somewhere to start.
    source: str | None = None
    note: str | None = None


REGISTER: tuple[DataSet, ...] = (
    DataSet(
        key="account",
        label="Account holder",
        subject="The BillGen user",
        fields=("email", "display name", "password hash", "interface language"),
        purpose="Authenticate the person and address them in their own language.",
        basis=LawfulBasis.CONTRACT,
        retention="Life of the account, then 30 days in backups.",
        erasure=Erasure.ERASE,
        source="core.models.user",
    ),
    DataSet(
        key="sessions",
        label="Sign-in sessions",
        subject="The BillGen user",
        fields=("refresh token id", "issued at", "revoked at"),
        purpose=(
            "Let a person see where they are signed in, and end a session "
            "they do not recognise."
        ),
        basis=LawfulBasis.LEGITIMATE_INTEREST,
        retention="Until the token expires or is revoked.",
        erasure=Erasure.ERASE,
        source="db refresh tokens",
        note="Already readable at GET /users/me/sessions and revocable one by one.",
    ),
    DataSet(
        key="clients",
        label="Client contacts",
        subject="The customer's own clients",
        fields=("name", "VAT number", "address", "email", "phone"),
        purpose="Address an invoice to a legally identified counterparty.",
        basis=LawfulBasis.CONTRACT,
        retention="Seven years after the last invoice, following the documents they appear on.",
        erasure=Erasure.RETAIN,
        source="core.models.client",
        note=(
            "Hosted, BillGen is the processor here, not the controller — this "
            "data belongs to the customer's relationship with their client, and "
            "an erasure request from a client goes to the customer, not to us. "
            "On the desktop it never reaches us at all."
        ),
    ),
    DataSet(
        key="invoices",
        label="Issued invoices and credit notes",
        subject="The customer's own clients",
        fields=("client identity", "line descriptions", "amounts", "payment references"),
        purpose="Issue a legally valid invoice and support the customer's VAT return.",
        basis=LawfulBasis.LEGAL_OBLIGATION,
        retention="Seven years (Belgian VAT Code art. 60 / CIR 92 bookkeeping retention).",
        erasure=Erasure.RETAIN,
        source="core.models.invoice",
        note=(
            "The dataset that makes 'delete my account' a workflow rather than "
            "a DELETE. An issued invoice is immutable and retained; only the "
            "account that can *see* it is closed."
        ),
    ),
    DataSet(
        key="audit",
        label="Audit log",
        subject="The BillGen user",
        fields=("actor", "action", "target", "before/after", "timestamp"),
        purpose="Prove who changed what — the integrity guarantee the invoicing core rests on.",
        basis=LawfulBasis.LEGITIMATE_INTEREST,
        retention="Seven years, with the documents it describes.",
        erasure=Erasure.ANONYMISE,
        source="core.models.audit_log",
        note=(
            "Append-only by construction (there is no update or delete on the "
            "repository). Erasure detaches the actor; it never rewrites history."
        ),
    ),
    DataSet(
        #  On a desktop install this is the ONLY dataset that reaches us, and
        #  it was the one not written down (T-36). Article 30 asks for exactly
        #  this: held by us, about a named person, for the life of a contract.
        key="licensing",
        label="Desktop licence",
        subject="The customer",
        fields=("email", "plan", "hardware fingerprint", "expiry"),
        purpose="Issue a desktop licence bound to one machine, and verify it offline.",
        basis=LawfulBasis.CONTRACT,
        retention="Life of the licence.",
        erasure=Erasure.ERASE,
        source="desktop/licensing.py",
        note=(
            "The licence is a signed file verified on her machine; nothing "
            "else she types leaves it. The fingerprint is a binding, not a "
            "secret — Windows' MachineGuid, read out to us for the signing."
        ),
    ),
    DataSet(
        key="consent",
        label="Consent records",
        subject="Visitor or user",
        fields=("categories chosen", "policy version", "timestamp"),
        purpose="Prove that consent was given, to what, and when.",
        basis=LawfulBasis.LEGAL_OBLIGATION,
        retention="Five years after the consent is withdrawn or superseded.",
        erasure=Erasure.RETAIN,
        source="not yet stored — see core.trust.consent",
        note=(
            "Deleting the proof of consent on request would destroy the "
            "defence it exists to provide."
        ),
    ),
)

_BY_KEY = {ds.key: ds for ds in REGISTER}


class Subprocessor(BaseModel):
    """A third party that touches customer data on BillGen's behalf.

    The DPA has to name every one of these, and promise notice before another
    is added. `in_use` separates what is live from what is merely intended —
    publishing a planned subprocessor as a current one is its own small lie.
    """

    name: str
    purpose: str
    location: str
    in_use: bool


#  Verify this against reality before it is ever published: a subprocessor list
#  is a factual claim, and this one is assembled from what the repository shows
#  (CI, the pre-sale deployment) plus the placeholders the roadmap's blockers
#  imply. Nothing here has been confirmed against a signed contract.
SUBPROCESSORS: tuple[Subprocessor, ...] = (
    Subprocessor(
        name="GitHub",
        purpose="Source code and CI. No customer data, unless a log is pasted into an issue.",
        location="United States",
        in_use=True,
    ),
    Subprocessor(
        name="Vercel",
        purpose="Hosts the pre-sale marketing site and its capture form.",
        location="United States / EU edge",
        in_use=True,
    ),
    Subprocessor(
        name="Hosting provider (VPS)",
        purpose="Runs the API and the database.",
        location="To be chosen — an EU region is required.",
        in_use=False,
    ),
    Subprocessor(
        #  The *sending* infrastructure, not the mailbox a human reads. It is
        #  a subprocessor because invoice PDFs and client names pass through
        #  it; the mailbox provider is not, because nothing routes customer
        #  data there. Confusing the two is how a mailbox ends up carrying
        #  bulk invoice delivery it was never rated for.
        name="Transactional email provider",
        purpose=(
            "Account mail — verification, password reset, support. Invoice "
            "delivery to the customer's own client is planned and not built."
        ),
        location="To be chosen — an EU region is required.",
        in_use=False,
    ),
    Subprocessor(
        #  Deliberately a second row rather than a second purpose on the one
        #  above. Marketing and transactional mail must not share a sending
        #  reputation — a few complaints on a newsletter would poison the
        #  domain that carries password resets — and they do not share a
        #  lawful basis either: one is asked for, the other is consented to.
        #  Two rows here is what keeps that separation visible to a reader of
        #  the DPA rather than buried in a deployment decision.
        name="Marketing email provider",
        purpose="Newsletters and product announcements, to recorded opt-ins only.",
        location="To be chosen — an EU region is required.",
        in_use=False,
    ),
    Subprocessor(
        name="Merchant of Record",
        purpose="Takes payment for BillGen subscriptions.",
        location="To be chosen.",
        in_use=False,
    ),
    Subprocessor(
        name="Peppol Access Point",
        purpose="Transmits e-invoices to the recipient's access point.",
        location="To be chosen — an EU-established provider.",
        in_use=False,
    ),
)


def register() -> tuple[DataSet, ...]:
    return REGISTER


def dataset(key: str) -> DataSet | None:
    return _BY_KEY.get(key)


def exportable() -> tuple[DataSet, ...]:
    """The datasets a subject-access export has to walk."""
    return tuple(ds for ds in REGISTER if ds.exportable)


def retained_on_erasure() -> tuple[DataSet, ...]:
    """What survives a deletion request, and must be said out loud on the screen.

    A privacy centre that offers "delete everything" and then keeps seven years
    of invoices has misled the person. This is the list the confirmation dialog
    is obliged to show.
    """
    return tuple(ds for ds in REGISTER if ds.erasure is Erasure.RETAIN)


def subprocessors(*, live_only: bool = False) -> tuple[Subprocessor, ...]:
    return tuple(s for s in SUBPROCESSORS if s.in_use) if live_only else SUBPROCESSORS
