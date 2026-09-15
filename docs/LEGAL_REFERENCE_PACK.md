# Legal reference pack — external terms, for comparison only

**This is not legal text and nothing in it should be copied verbatim into a
BillGen document.** `core/trust/legal.py` says it plainly for its own registry
— *"a generated DPA that reads like a real one is worse than a missing
one — it would be signed"* — and the same warning applies to this file. What
follows is structural notes on how four other companies shaped their terms,
gathered 2026-09-13 so whoever drafts BillGen's seven documents (T-16) is not
starting from a blank page, and so the gaps below are recognised as gaps
rather than copied.

Two of the four are Google, because BillGen's TVA suggestions are a
generative-AI feature and Google runs the most litigated, most-copied ToS on
the internet. The other two are the competitor set `BETA_LAUNCH_PLAN.md`
already benchmarks on price and Peppol — Billit and Moneybird answered;
Dexxter and Accountable did not yield a fetchable page on the day this was
compiled and are noted as gaps, not absences.

## Google — Terms of Service

<https://policies.google.com/terms> (current), full text also archived at
<https://www.gstatic.com/policies/terms/pdf/20260730/4te5pybt/google_terms_of_service_en_us.pdf>.

Seven top-level sections: *Your relationship with Google → Using Google
services → Content in Google services → Software in Google services → In
case of problems or disagreements → About these terms → EEA instructions on
withdrawal.*

Two patterns worth taking from it, not the prose:

- **The liability cap is a formula, not a flat number.** For business users:
  the greater of €500 or 125% of the fees paid in the twelve months before the
  claim. A flat cap (see Billit, below) punishes a customer who has paid for
  years on the same clause a brand-new signup gets.
- **Material changes get advance notice and an exit, not just a changelog.**
  EEA consumers get an explicit 14-day withdrawal window with reimbursement.
  BillGen's `terms` entry already flags that acceptance has to be a per-user,
  per-version record (`legal.py:82-85`) — this is the other half: a version
  bump has to carry a notice period, or the acceptance record measures
  nothing.

## Google — Generative AI Prohibited Use Policy

<https://policies.google.com/terms/generative-ai/use-policy>

The structural fact that matters most for BillGen: **Google does not fold
this into its general Terms of Service — it is a separate, linked document.**
Four categories of prohibited use (dangerous/illegal activity, security
threats, harmful content, deceptive practices), one disclosure duty relevant
to a product that marks AI output the way T-08 does — *don't claim
AI-generated material "was created solely by a human, in order to deceive"*
— and a named limit on autonomous action: automated decisions with a material
adverse effect on a person, in a high-risk domain, should not happen without
human supervision. No liability language in the policy itself; it governs
conduct, not damages.

This is the open question below: BillGen's `ai_transparency.py` already
tracks *which surfaces* need marking and *why* the education surface must
never cross into Annex III scoring. None of that lives in a customer-facing
document today — `legal.py`'s seven do not include one. Google's answer is a
separate document; folding it into `terms` instead is also defensible and
cheaper to maintain at BillGen's size. Henri's call, not this pack's.

## Billit — Terms of Use

<https://www.billit.eu/nl-be/juridische-info/gebruiksvoorwaarden/> — Belgian
e-invoicing/Peppol competitor named in the benchmark.

Thirteen sections, and the useful finding is what is **missing**, because it
is the same gap T-16 is trying not to leave: no DPA, no subprocessor list, no
SLA, no termination clause, and no mention anywhere of automated or
AI-assisted output — despite Billit processing invoice data at the same
Peppol layer BillGen targets. Liability is capped at €1 or whatever the
insurer recovers, whichever is greater, with indirect and consequential
damages excluded outright — a much harder line than Google's formula, and one
more people sign without reading than push back on. Governing law is Belgian,
jurisdiction Antwerp. Terms take effect 14 days after publication, which is
the same notice-period idea as Google's but without the exit right attached.

## Moneybird — Terms of Use

<https://www.moneybird.nl/terms/> — Dutch/Benelux accounting SaaS, also in
the benchmark set.

Eight sections, and two are worth naming because BillGen's own shape maps
onto them directly: a **Liability & indemnification** section held separate
from **Termination** (BillGen's `terms` and the future SLA are two documents;
Moneybird keeps both ideas inside one ToS instead), and a **Privacy** section
that states Moneybird's processor role *inside the terms themselves* rather
than pointing to a standalone DPA — which is close to what T-36 is currently
correcting BillGen's own register toward (processor status stated per
deployment shape, not asserted once and left to drift). One more clause worth
noting: Moneybird restricts use to the business activity and SBI code the
customer declared at signup — an acceptable-use boundary tied to *who the
customer said they were*, which has no equivalent in BillGen's `terms` note
today.

## Dexxter / Accountable — not captured

Both are named in `BETA_LAUNCH_PLAN.md`'s benchmark. Dexxter's English terms
page 301-redirected during this pass and was not re-fetched; Accountable's
terms did not surface a dedicated page in the same search pass. Worth a
second attempt when T-16 is actually being drafted rather than scoped —
these two are the closest competitors on price and target customer
(sole traders), closer than Google or a Dutch mid-market player, so their
liability and acceptable-use language is the most directly comparable
still missing from this pack.

## What this pack does not decide

- Whether BillGen's terms carry a Google-style liability *formula* or a
  Billit-style flat cap. Counsel's call, informed by T-36's processor-status
  correction — the answer likely differs between the hosted and desktop
  shapes.
- Whether AI usage terms are a clause inside `terms` or an eighth document in
  `core/trust/legal.py`, the way Google keeps its Generative AI policy
  separate from its main ToS. See T-41.
- Any prose. Nothing here is a draft, a template, or a starting paragraph —
  it is a map of what four other companies chose to say and, at Billit, what
  they chose not to.
