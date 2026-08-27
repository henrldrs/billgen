# Next session — TODO

Rewritten 2026-08-27 at the end of the nav-curation + screens session; the
previous version was consumed. Delete it once this one is consumed too. It is a
handover note, not a permanent document. The permanent map is
[HANDOFF.md](../HANDOFF.md), the board is [ROADMAP_IA.md](ROADMAP_IA.md), and the
measured picture is
[ARCHITECTURE/system-architecture.html](ARCHITECTURE/system-architecture.html)
(v0.10, regenerated against this session's HEAD).

**State:** Python 298 passed, frontend **157** passed, ruff clean, four
workspaces typecheck. Coverage 20% → **26%** with no backend work.

---

## 0. The one-line summary

**The frontend backlog is empty, and that is the news.** Every screen that was
waiting on an endpoint which already existed has been built. What is left on
this board is not code you can write in an afternoon — it is a repo with no
remote, a company that does not exist yet, and an Access Point nobody has
contacted.

---

## 1. FIRST — push the repo (`BGEN-OPS-01`) · blocked on Henri

Unchanged, still the only total-loss risk, and now the only thing on this page
that gates everything else. `git remote -v` is empty; five sessions of work sit
on one disk.

GitHub account **`henrldrs`**. `gh` is not installed here, so a session cannot
create the repo. Either:

- **A.** Create an empty **private** repo `billgen` (no README, no gitignore, no
  licence) at github.com/new and paste the URL → next session adds the remote,
  pushes `main` plus the phase tags, and watches CI.
- **B.** `winget install --id GitHub.cli`, then `gh auth login` (opens a browser,
  so Henri must run it) → next session does all of it.

**Expect the first CI run to be an experiment.** `.github/workflows/ci.yml` has
never executed. Its Postgres leg is the first real test of the gapless-numbering
row lock and of `quota_guard`'s lock — both no-ops on SQLite. A red first run is
information, not a regression.

---

## 2. The three clocks (from the council, 2026-08-27)

Full transcript: `docs/council/council-transcript-20260827-110414.md` — **local
only**, `docs/council/` is gitignored as working notes, so it will not survive a
clone. Five advisors, anonymised peer review, chairman synthesis. What survived
review:

1. **Push the repo.** Unanimous, unprompted, as the first sentence of all five.
2. **Start the two external clocks the same week.** (a) Register the
   eenmanszaak via an ondernemingsloket (~€100, about a day, VAT number
   follows). (b) Email two or three Access Point **resellers** for pricing and
   onboarding requirements. Both are other people's queues; starting them costs
   an afternoon and buys weeks.
3. **When the AP contract lands, send one real invoice to a real recipient.**
4. **Then** wire the Merchant of Record (Paddle / Lemon Squeezy — entity, EU VAT
   and checkout in one move). By then the AP's per-document cost tells you your
   price floor, which is information the product does not have.

**The clash the peer review dissolved:** "validate first" and "incorporate
first" are the same path. An Access Point needs a company number, so the
validation the majority demanded cannot happen before the entity the executor
demanded. Incorporating here is not a monetization step; it is test equipment.

**One correction to the framing, from Henri and now in the docs.** The demo's
PDF → Peppol path was already exercised with a real user. The gap is
**transmission from inside the app** — sending over the network the way KBC's
billing app does, rather than handing a file to Doccle. And you do not need to
*be* an Access Point: reselling one turns an existential interop risk into
procurement.

**What the council flagged and nobody here has answered:** runway. Non-employed,
months in, zero revenue. How many months can this be funded? That, not the
mandate, sets the real deadline — and it decides whether the weeks-long "blocked
on a four-minute task" state is avoidance or burnout, which have opposite
treatments.

---

## 3. What shipped 2026-08-27 (do not rebuild it)

- **Nav curation, the mechanism** — `nav?: boolean` + `mergedInto?: string` on
  `IaNode`, `isNavDestination()` / `navNodes()` beside `routableNodes()`. A
  hidden node keeps its path, its status and its place in `coverage()`; old URLs
  redirect. Company 9 nav entries → 1, Clients 7 → 3. The cut for the other ten
  sections is written into [ROADMAP_IA §11b](ROADMAP_IA.md) as a proposal and
  built by nobody — **it needs Henri's yes**.
- **Five screens** — duplicate button, VAT-rate picker (the hardcoded
  `21/12/6/0` is gone), catalog server filters + Archived as a preset view,
  payments report, invoices report. All over endpoints and hooks that already
  existed.
- **Two dead links** found by checking the running app: "Client 360" and
  "Invoice detail" were nav entries whose paths carry route parameters, so they
  navigated to the literal `:clientId`. Same bug in the command palette.
- **Architecture v0.10** — regenerated, plus a new §17 "Decisions of Record"
  carrying §11b/§11c/§11d and the Peppol correction.

---

## 4. Open decisions — cheap now, expensive later

1. **Approve or redraw the §11b nav cut for the remaining ten sections.** One
   reading, then a session of route work. Proposal is ~100 entries → ~45.
2. **Tier naming final?** `free / starter / business / business_pro`. A rename
   is a server change plus four translation keys until a real subscription row
   references the string.
3. **The Business Pro shell — decided in principle, unbuilt.** The top tier's
   differentiator is an administration surface for the billing owner, encoded as
   `team_administration: True` and `vat_report: "consolidated"`. Nothing renders
   either. Needs design: seats, per-entity usage, consolidated reporting,
   member management.
4. **Seats are declared and unenforced.** `Meter.SEATS` is metered and visible;
   nothing consumes it, and there can be no invite flow without **B1** (email).
5. **Roles are modelled and unenforced.** `Role = owner | admin | member |
   viewer` rides in the JWT and is read in exactly one place (`/users/me`, to
   display it). **A `viewer` can void an invoice today.**
6. **Graded features are presentation only — decide.** `vat_report`,
   `dashboard`, `search`, `pdf_customization`, `import_legacy`,
   `accountant_export` are read by the UI to pick a variant and refused by **no
   endpoint**. Anyone calling `GET /reports/vat` directly gets the whole report
   on Free. Either add a graded server check or accept it; the product is
   silently choosing the second.
7. **The VAT category is hardcoded.** `core/rules/vat.py` has `pick_category()`
   — buyer country, buyer VAT number, seller country — and **no route calls
   it**. Every invoice line ships `category: "S"`. Reverse-charge (intra-EU B2B)
   and export lines cannot be composed at all. This is the first real gap in the
   Belgian VAT story now that the rate picker is honest.
8. **Downgrade / lapsed-subscription contract.** Code behaviour is settled and
   tested (over-limit keeps every record, refuses only new creation). The legal
   treatment — retention after cancellation — belongs in the DPA before a
   cancellation flow is built.

---

## 5. Backend still open, in rough value order

- **B1 — email.** Highest fan-out: password reset, verification, send invoice,
  payment reminders (BE three-step escalation), team invites, support inbox.
  Unblocks §4.4.
- **Peppol transport.** See §2 — a procurement clock, not a coding task.
- **Checkout / Merchant-of-Record.** The provider is an adapter that writes
  `SubscriptionRow`; `resolve_tier()` already prefers it over
  `Organization.plan_tier`. Until it exists, six of the eight Billing areas have
  nothing to show.
- **B2 — blob storage.** All 7 Documents areas, company branding, company
  documents. `Company.logo_key` is a dangling reference right now.
- `GET /alerts` — server-side rules engine (overdue, clients missing VAT).
- `GET /search?q` — the palette navigates pages; it cannot find an invoice by
  number, which is what people reach for it to do.
- `GET /reports/payments` — the payments screen deliberately prints no total
  because this does not exist.
- **Quotes** — own numbering series, must not touch the invoice sequence.
- Recurring invoices — Starter+ in the matrix, with no model, scheduler or job
  runner behind it.

---

## 6. Watch items

- **`quota_guard`'s concurrency guarantee is unproven** until CI runs against
  Postgres (§1). On SQLite `with_for_update()` is a no-op.
- **The dev pair cannot produce a 402.** `scripts/dev_desktop_api.py` runs with
  `DESKTOP_MODE=true` and `_exempt()` skips every entitlement check — the same
  flag that gives credential-less login. The upgrade dialog has never been seen
  in a browser. The fix is a second dev pair in non-desktop mode with an
  ordinary signup, not a change to `_exempt`.
- **`PdfService(branded=...)` defaults to `True`.** A call site that forgets it
  shows a footer rather than silently giving away the paid feature.
- **The invoice allowance is consumed at draft creation, not at issue** —
  deliberate, because issuing is legally load-bearing and must never fail for a
  commercial reason. A deleted draft frees its slot.
- **This document's own failure mode.** Four screens closed this session were
  described here and in the architecture report as blocked on a backend that had
  already shipped. A gap ledger is only as true as its last reading, and nothing
  re-reads it automatically.
