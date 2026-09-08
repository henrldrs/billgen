# Beta launch plan — BillGen as a registered company

**Objective:** release the BillGen beta from a legally constituted business
holding a BCE number, with two consultancy clients invoiced, and a hosted
instance a client in another country can actually use.

Written 2026-09-08 from a working session. This is a **business-launch plan**,
not a code queue — [TICKETS.md](TICKETS.md) is still where engineering work is
taken from, and [SOLO_RUN.md](SOLO_RUN.md) is still the resume protocol. This
file covers the half of the launch that no amount of committing solves.

---

## The dependency almost nobody draws

One item gates four others. Worth seeing before choosing what to do first.

```
  accountant hour
        |
        +-- entity form (personne physique vs SRL)
        +-- VAT regime (standard, not franchise)
        +-- domiciliation address  <- cheaper BEFORE registering than after
        |
        v
  BCE + VAT number
        |
        +-- invoice to mother                     (W5)
        +-- invoice to Emilia                     (W5)
        +-- mentions legales -> billgen.be live   (W4)
        +-- mentions legales -> henrioutai live   (W4)
        +-- EV code-signing certificate           (W3, desktop line)
```

The legal source for the middle three is our own registry,
[core/trust/legal.py](../core/trust/legal.py), rendered in
[LEGAL_BRIEF.md](LEGAL_BRIEF.md): *mentions légales* blocks "publier légalement
le site vitrine", and *politique de confidentialité* blocks "collecter une
adresse e-mail sur le site vitrine". Both need the number.

**Consequence for sequencing:** the accountant appointment has the longest
external latency and the widest blast radius. It is item 1 on every version of
this plan.

---

## W1 · Legal entity and tax

Owner: Henri. Nothing here is code and nothing here can be delegated.

| # | Item | State | Note |
|---|---|---|---|
| 1.1 | Book the accountant hour | **todo** | Longest lead time. Book before doing anything in 1.2–1.5. |
| 1.2 | Decide domiciliation address | **todo** | The one decision materially cheaper before registration. See below. |
| 1.3 | Register at the guichet (Xerius) | blocked on 1.1–1.2 | Xerius doubles as the social insurance fund. |
| 1.4 | VAT regime — standard, not franchise | decided | Recorded in [NEXT_SESSION.md](NEXT_SESSION.md) §S3: we sell VAT software to B2B who deduct anyway, and registering lets us deduct Vercel, domains, hardware. |
| 1.5 | Social insurance affiliation (*indépendant complémentaire*) | blocked on 1.3 | Mandatory, not optional, even as a secondary activity. |

**Fedasil cumul: cleared.** Confirmed 2026-09-08 — no conflict-of-interest
restriction applies. This was previously treated as a gate; it is not.

### The four questions for the accountant hour

Go in with these, not with "what should I do":

1. *Personne physique* vs SRL, given a beta SaaS that will hold third-party
   personal data — and the trigger that should make me revisit the answer.
2. Can I use a **domiciliation address** as the establishment address, so my
   home address does not enter the public KBO register, the *mentions légales*,
   and every invoice?
3. Confirm standard VAT regime rather than *franchise*, given B2B software
   sales and the deductions above.
4. **Intracommunity services listing** for a Dutch B2B client — what do I file
   and when? (Triggered specifically by Emilia; would not exist if she were
   Belgian.)

### Why the address decision is urgent

The KBO/BCE is a free, public, searchable register. It publishes the enterprise
number, legal name, legal form, activity codes, start date, VAT status **and the
registered address**. For a *personne physique* working from home, that is the
home address — and it then propagates to the *mentions légales* on both sites
and to every invoice issued. One exposure, copied to three public places.

A domiciliation or business-centre address keeps it out of all three. Rules
differ between natural persons and companies, and some communes want the
activity address to be where the activity happens, so this is a question for
Xerius directly — but it is settled **before** registration, not after.

---

## W2 · Documents and contracts

The seven-document registry in [core/trust/legal.py](../core/trust/legal.py) is
scoped to *public launch*. **Two clients on a free beta need fewer than seven.**
Sorting them is most of the work here.

| Document | Needed for the beta? | Why |
|---|---|---|
| Mentions légales | **yes** | Blocks publishing either site legally. Needs the BCE number. Cheapest of the seven — an hour of copying the KBO record, not a drafting engagement. |
| Politique de confidentialité | **yes** | The site holds addresses the moment the Upstash credentials land. |
| DPA | **yes, for Emilia** | She will put *her clients'* personal data in the instance. The one that genuinely binds even on a free beta. |
| Liste des sous-traitants | **yes** | The DPA has to reference it. Currently two entries — GitHub, Vercel. |
| Conditions générales | not yet | Blocks "charging money; any paid signup". The beta is free. |
| SLA | no | Enterprise offers only. |
| Politique cookies | no | One functional cookie, set on a click, already disclosed in the footer. |

**The registry's own rule holds: no generated legal text.** A DPA that reads
like a real one is worse than a missing one, because it would be signed. The
first three above are a lawyer's or the accountant's work; what we own is
knowing which three.

### Contracts to settle

| # | Item | State |
|---|---|---|
| 2.1 | Emilia — consultancy scope + price | blocked on form answers, then meeting 2 |
| 2.2 | Emilia — beta access + DPA | blocked on W1 (entity) and legal drafting |
| 2.3 | Mother — scope sheet + tariffs | tariffs done; scope sheet **todo** |
| 2.4 | Mother — invoice | drafted and held until the BCE number exists |

**One invoice per client, from henriOutai.** BillGen and henriOutai are
*noms commerciaux* over one legal person; the legal name and BCE number must
appear on every invoice regardless of which brand is on the letterhead. This
settles the short-term half of the entity question — no separate company for
BillGen now.

---

## W3 · Infrastructure — the hosted MVP

**Decision taken 2026-09-08: Emilia gets a hosted instance, not a desktop
build.** This inverts the 2026-07-12 sequence (*safety net → desktop installer →
web deploy*) recorded in
[ADR-0004](ARCHITECTURE/ADR-0004-web-deployment.md), and the inversion is
deliberate: that ordering was chosen when there was no customer.

Reasoning, kept because the reversal will look arbitrary in six months:

- A desktop build puts her invoicing data where we **cannot see it, cannot back
  it up, and cannot fix it** — no crash reporting, F1 ⚠️ nothing aggregates
  logs, F2 ❌ no metrics, and C3's *"no automated backups, no restore ever
  rehearsed"*. On a laptop in another country, holding data under a seven-year
  retention obligation.
- Desktop still needs a **frozen sidecar, an NSIS installer, an activation flow
  and an EV certificate** ([HANDOFF.md:43](../HANDOFF.md:43), all Phase 12). The
  EV certificate requires a registered business, so the desktop path is gated on
  W1 *as well*.
- Every hosted blocker is work required for the SaaS anyway.

**Public-signup blockers are not one-client blockers.** ADR-0004 names email a
hard gate because "a forgotten password is a permanent lockout" — true for
public signup, but for one hand-held beta client it collapses to resetting a
password by hand. Same for checkout (beta is free), blob storage (set her logo
manually), the in-memory rate limiter (correct at one instance) and RLS (one
real tenant).

| # | Item | State |
|---|---|---|
| 3.1 | Accept or amend ADR-0004 | **todo** — still marked *proposed*, and we are about to build from it |
| 3.2 | Provision the VPS | **todo** — D7 ❌; the decision exists, the machine does not |
| 3.3 | Docker compose + Caddy + managed Postgres | written in `infra/`, never run |
| 3.4 | API serves the SPA | **todo** — nothing is reachable end to end |
| 3.5 | Automated backups **and one rehearsed restore** | **todo** — the most important item in W3. An untested restore is a belief. |
| 3.6 | Provision Emilia's tenant by hand | blocked on 3.2–3.4 |

### The spare laptop

It should not be Emilia's production host: residential IP, home-broadband
uptime, no UPS, and — until 1.2 is settled — it sits at the address we are
trying to keep out of the public register.

It has three jobs it is genuinely good at, and they are worth doing:

- **staging / build box** — somewhere to run a deploy before the VPS sees it
- **the mother's instance** — local, in Belgium, physically reachable
- **an off-VPS backup target** for 3.5

---

## W4 · Sites live

### billgen.be

| # | Item | State |
|---|---|---|
| 4.1 | Create `contact@billgen.be` | **urgent** — it is in the signature of an email already sent to a prospect, and [NEXT_SESSION.md:231](NEXT_SESSION.md:231) records **zero of two** mailboxes used. Replies to it currently go nowhere. |
| 4.2 | Point `billgen.be` at Vercel | todo — keep nameservers at LWS, mail lives there |
| 4.3 | Upstash credentials → waitlist/inquiry | built, 503 until configured |
| 4.4 | Mentions légales + privacy notice | blocked on W1 |
| 4.5 | Connect Vercel → GitHub | todo — deploys currently ship the working copy, not `main` |
| 4.6 | Native reads, NL and PT | todo — this is a compliance product; the copy is the credibility |

The local site repo is **12 commits ahead of origin** and deploys are manual.
Verify what is actually live before telling a client a page exists — the PT
locale is committed locally but may never have been deployed.

### henrioutai.com / .space

**First: confirm which domain is actually registered.** The repo has no record
of either; memory has `billgen.be` delegated and `billgen.com` belonging to
someone else. Nothing here should be planned on an unverified domain.

Fastest credible v1 is not a build. The council transcript in
[docs/council](council) already reached it: publishing `@henrioutai/ui` — 72 MIT
components, marked public-ready — *"costs a weekend and buys you a public
artifact with your name on it… that's your top-of-funnel."* Ship the library and
a page saying who you are, not a bespoke site.

---

## W5 · Consultancy clients

| | **Emilia** | **Mother** |
|---|---|---|
| Market | Netherlands | Belgium |
| Pillars | BillGen beta + consultancy (planning, marketing, inbox triage) | Brand (flyer, logo, site) + tariffs + BillGen |
| BillGen delivery | **hosted instance** (W3) | **desktop, local** — never leaves her machine |
| Status | call 2026-09-07; welcome email sent 2026-09-08 | logo done; flyer text and tariffs done, incl. her own correction round |
| Next action | **send the intake form** | scope sheet + palette alignment to the new logo |
| Blocked by | form → meeting 2 → proposal | nothing until the invoice |
| Price shape | deferred to meeting 2, deliberately | **to set** — the actual reason nothing has been charged yet |
| VAT treatment | reverse charge, 0%, Art. 51 §2 — **requires her valid VAT number, verified** | Belgian, 21% |
| Invoice | blocked on BCE | drafted, held for BCE |

**Invoicing Emilia is technically ready.** [SOLO_RUN.md](SOLO_RUN.md) item 8
records it verified in the running app against a real Dutch client: VAT category
`AE`, 0%, Article 51 §2 mention shown. The product can issue her invoice the day
the number exists.

### Two corrections carried from this session

1. **Do not seed her beta from the "Maria (MaryCleaning Services)" demo.**
   `MaryCleaning` returns **zero hits** across every `.py`, `.ts`, `.tsx`,
   `.json` and `.md` in this repo — there is nothing here to adapt from. More
   importantly, if that demo holds a real person's client data, copying it into
   another client's tenant is exactly the risk [LEGAL_BRIEF.md](LEGAL_BRIEF.md)
   names: *"BillGen traite les données des clients de ses clients."*
   **Seed synthetically.**
2. **The form is henriOutai's, not BillGen's.** Most of it is consultancy
   intake, and hosting it under `billgen.be` would make Google Forms a BillGen
   subprocessor — adding an entry to a registry whose entire value is that it is
   short and true. Keep BillGen's subprocessor list at two.

---

## This week — Tuesday 2026-09-08

Meeting-2 windows offered to Emilia are Wed 9, Thu 10, Fri 11. The email
promised the form "nos próximos dias" and promised no proposal before the
answers are in. If she takes Wednesday, those two promises collide.

| Day | Do |
|---|---|
| **Today** | Book the accountant. Create `contact@billgen.be`. Send the form ([CLIENT_INTAKE_FORM.md](CLIENT_INTAKE_FORM.md)). |
| Wed–Fri | Meeting 2. If it lands before the answers arrive, run it as intake-by-conversation — do **not** quote a price. |
| Any day | Mother's scope sheet and tariff page. Nothing blocks it but the invoice. |
| After the accountant | Registration, then unblock W2, 4.4, and both invoices. |

---

## Open questions

Recorded rather than guessed:

- **Which henriOutai domain is registered** — `.com`, `.space`, both, neither.
- **What "Maria (MaryCleaning Services)" refers to**, and whether it is a real
  business whose name was disclosed to a prospect without permission.
- **Desktop as a product line** — deferring it for Emilia is not cancelling it.
  It needs its own decision once W1 makes an EV certificate purchasable.
- **The long-term entity question** — whether BillGen eventually separates from
  henriOutai is a real question. It is not this month's, and nothing here
  forecloses it.
