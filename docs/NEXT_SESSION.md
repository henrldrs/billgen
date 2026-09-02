# Next session — TODO

Rewritten 2026-08-28 at the end of an unattended backend session; the previous
version was consumed. Delete it once this one is consumed too. It is a handover
note, not a permanent document. The permanent map is
[HANDOFF.md](../HANDOFF.md), the board is [ROADMAP_IA.md](ROADMAP_IA.md), and
the measured picture is
[ARCHITECTURE/system-architecture.html](ARCHITECTURE/system-architecture.html)
— **v0.10, generated against the previous session's HEAD and now one session
stale.** Regenerating it is on the list below.

**State:** Python **392** passed (was 298), frontend 157 passed, ruff clean,
typecheck clean. This session's commits are **all unpushed** — see §1.

Every new endpoint was also exercised live against the desktop dev pair on
:8010 (`python scripts/dev_desktop_api.py`), not only under pytest — alerts on
the seeded data, a quote created, sent, accepted and converted to a draft
invoice. That quote is still in `var/billgen.desktopdev.db` if you want
something to look at; that database is disposable and rebuilds itself.

**Your own `var/billgen.dev.db` needs a migration.** The desktop dev DB uses
`create_all` and picked the quote tables up on its own; the day-to-day one does
not:

```bash
python -m alembic upgrade head
```

---


---

> **Two workstreams now.** Section **S** below is 2026-09-02 and covers the
> pre-sale website, the domain and the business setup. Sections **0–7** are the
> 2026-08-28 backend note, **untouched this session** — no backend code ran, no
> tests were re-run, and everything they say is still outstanding still is.
> `audit-engine-and-scaffolds` is **ahead of origin by 3 commits** from this
> session and needs a push.

---

## S. The pre-sale site is live — 2026-09-02

**https://billgenbe.vercel.app** serves the BillGen page. It had been serving
the old FinanceFlow site for six months.

| | |
|---|---|
| Repo | `github.com/henrldrs/pre_sale_billgen` — **public** |
| Local | `../billgen_presale_website` (renamed from `finf_siteweb`) |
| Vercel project | `billgen.be` |
| Stack | Next.js 16.1.6, static, one route, no server functions |
| HEAD | `a538168` |

**Why it was stuck for most of the session:** the rebrand lived on a local
`billgen-rebrand` branch that was never merged. An earlier message in that
session claimed `main` had been fast-forwarded onto it; that command was written
out but never run, so `git push` faithfully published FinanceFlow. `main` is
correct now. If a deploy ever looks stale again, check `git branch -vv` before
anything else.

**Deploys are manual.** The Vercel GitHub App is not installed on the account
(GitHub Apps lists Claude, Google AI and Linear — no Vercel), so there is no
webhook and pushes do not build. Publishing is:

```bash
npx vercel --prod
```

run from the site folder. That uploads the **working copy**, not `main` — so it
can ship uncommitted work. Fixing this is item 1 below.

### S1. Site todos, in order

1. **Connect Vercel → GitHub.** Project → Settings → Git → Connect Git
   Repository, then grant the App access to `pre_sale_billgen`. Until then every
   deploy is manual and can diverge from `main`.
2. **Waitlist endpoint.** The form falls back to `mailto:`, which loses anyone
   without a configured mail client — most mobile visitors. This is the one open
   item that costs real signups. Decision already taken: a Next route handler at
   `/api/waitlist` sending via Resend, function region pinned to `fra1`, rather
   than Formspree — prospect addresses stay in your own infrastructure. **Not
   started.**
3. **i18n — designed, drafted, not landed.** Agreed shape: `content.ts` exports
   `dictionaries` keyed `en`/`fr`/`nl` with a `Dictionary` type derived from the
   English object so a missing key is a type error; a client-side switcher in
   the footer; locale in `localStorage`, first guess from `navigator.language`;
   `document.documentElement.lang` updated on switch. Full FR and NL copy for
   every section — meta, hero, all 12 cards, audience, waitlist, footer — was
   written during the session but **never reached disk** (the write failed and
   the repo is clean at `a538168`). It has to be redone.
   *Accepted tradeoff:* one route, so no `/fr` `/nl` URLs and no `hreflang`.
   Fine while nothing ranks; revisit before real SEO effort.
   *Before it ships:* the FR and especially the NL want a native read. This is a
   compliance product and the copy is the credibility.
4. **Footer rebuild.** Not started. Planned: brand, tagline, contact, the
   language switcher, private-beta status, one data-protection sentence.
5. **Privacy notice.** Missing. Not urgent *today* only because the `mailto:`
   fallback stores nothing — it becomes a GDPR requirement the moment item 2
   lands and the site starts holding addresses.
6. **`noindex` decision.** The `.vercel.app` URL is indexable and will compete
   with `billgen.be` in search later.
7. **Repo visibility** — public as of now.

### S2. Domain and mail — blocked on LWS

- **`billgen.be` is bought (LWS) but returns NXDOMAIN** — no nameservers
  published at the `.be` registry. Nothing resolves and no mail can be delivered
  until it is delegated. Check in the LWS panel whether the DNS zone is editable
  or greyed out: if editable, nothing is actually blocking you.
- **The LWS block is identity verification** — the account name is
  `HENRIQUE D RIBEIRO`, the ID says `HENRIQUE DOUGLAS RIBEIRO DA SILVA`. Ask
  support for a **correction of the holder's name**, not a change of holder; for
  `.be` a registrant change is a transfer of ownership with its own procedure.
- **Keep DNS at the registrar**, not at Vercel — mail records live there too.
  Email needs only delegation plus an MX; it does **not** need the website, so
  the mailbox can go live before the domain points anywhere.
- **`contact@billgen.be`:** Proton custom domain (paid plan) is the better route
  since Proton is already in use — proper SPF/DKIM/DMARC matters for an
  invoicing product's deliverability. LWS mail is the fallback.
- **When the mailbox exists:** set `NEXT_PUBLIC_CONTACT_EMAIL=contact@billgen.be`
  in Vercel **and redeploy** — `NEXT_PUBLIC_*` is inlined at build time, so an
  env change alone does nothing.
- **`billgen.com` is not available.** It is a live fuel-bill-generator business
  on Hostinger, with schema.org markup claiming the name "BillGen". A naming
  question, not just a domain one. Unresolved.

### S3. Business setup — Henri, not code

- **Xerius** as *guichet d'entreprises* is a fine choice; every recognised one
  does the same statutory work. It doubles as the social insurance fund, which
  is convenience and mild lock-in.
- **Hello bank! Pro** — before signing, confirm **CODA / CAMT.053 export and
  API access**. Payment reconciliation against the `+++/+++` structured
  communication is a BillGen feature; you will be your own test case. Compare
  **Qonto** on exactly that axis.
- **Decide legal structure and VAT regime before the counter asks.** Do **not**
  take the *franchise* exemption — you sell VAT and Peppol software, and B2B
  customers deduct VAT anyway. Registering also lets you deduct VAT on Vercel,
  domains and hardware.
- Being VAT-registered puts you inside the Belgian B2B e-invoicing mandate —
  which is dogfooding, and a credibility line for the site.
- Worth one paid hour with a comptable on sole trader vs SRL.

### S4. Pool — specs exist, nothing started

Committed this session under `docs/`, all Henri's own specs:

- **Onboarding quiz** (`docs/onboarding feature .txt`) — the big one. Five
  steps: language + theme, entity type with KBO mod-97 validation, feature
  toggling by business profile, data seeding and branding, then a guided first
  invoice. Explicitly a scaffolding engine, not a tour.
- **Settings surface** (`docs/settings exhaustive list.txt`)
- **Dashboard** (`docs/dashboard nice to have.txt`)
- **SaaS appearance pass** (`docs/appearance for saas.txt`)

**AI Studio reference build** is now unzipped at
`docs/billgen---enterprise-invoicing-&-financial-saas/`. Read it for the design
layer (`tokens.css`, `components.css`), the domain types, the settings IA and
the French vocabulary. **Do not port** its palette — it is `#2563EB` blue with
Plus Jakarta Sans and will fail the emerald + Satoshi guard test — and do not
port its Peppol language: it shows *transmission* and recurring invoices, and
the product does neither.

*Housekeeping:* `docs/billgen.bat` is an untracked accidental copy of the root
launcher, and the prototype `.zip` now duplicates the unzipped folder.

---

## 0. The one-line summary

**The backend backlog is now the part that needs other people.** Everything on
the previous list that could be written without an SMTP server, an Access Point
contract or a payment provider has been written: roles are enforced, the VAT
rule is wired, search, alerts and the payments total exist, and quotes have
their own numbering series. What is left is B1 (email), transport, checkout and
blob storage — and a Postgres bug that would have failed the first CI run.

---

## 1. FIRST — push (`BGEN-OPS-01`) · one command, needs Henri

The remote now exists (`origin` → `github.com/henrldrs/billgen`, and `main` was
in sync with it at the start of this session — the previous note's "the repo has
no remote" is out of date). **Everything since `e893b59` is sitting unpushed on `main`** — eight commits that change behaviour, plus the documentation ones that describe them (`git log --oneline e893b59..HEAD`).

They were not pushed because pushing runs CI and publishes work Henri has not
read, and this session ran while he was asleep. It is one command:

```bash
git push origin main
```

**Two documents disagree about whether CI has ever run, and this session cannot
settle it.** The previous note and the header comment in
`.github/workflows/ci.yml` both say it has never executed; the deployment record
says the 2026-08-27 push ran it for the first time. `gh` is not installed here
and nothing local carries a run result, so **check the Actions tab first** — and
fix whichever of those two comments turns out to be stale.

It matters for §3. The Postgres leg runs the suite against a real Postgres, so
`create_all` runs there — and that is exactly what the duplicate constraint name
would have broken, at the first fixture, in every API test. If that leg has
already gone green, the reasoning in §3 is wrong and the rename is merely
tidier; if it went red, §3 is the likeliest reason.

That leg is also the first real test of the gapless-numbering row lock and of
`quota_guard`'s lock — both no-ops on SQLite.

---

## 2. What shipped 2026-08-28 (do not rebuild it)

The commits that changed something, each with its reasoning in its own message:

1. **Roles stop being decoration** (`api/authz/`). A `viewer` could void an
   invoice; every write endpoint was open to every member. Endpoints now declare
   a *permission*, never a role name — the sibling of `api/entitlements` and
   shaped like it. 403 and 402 stay apart, and the permission check is declared
   **before** the quota check so a viewer on a spent allowance is told the true
   thing. `/users/me` carries the permission list so the UI can hide the button;
   hiding is UX, the server refuses regardless.
2. **`GET /vat-treatment`.** `core/rules/vat.pick_category` had existed since the
   domain was written and no route called it, so every line shipped `category:
   "S"`. Intra-EU B2B (reverse charge, Article 51 §2 mention) and export outside
   the EU are now answerable. Advisory, not enforced — the caller knows things
   the data does not. Nothing downstream needed changing: the PDF context already
   derives mentions from line categories and the UBL builder already emits
   `TaxExemptionReason`.
3. **`GET /search?q`.** Invoices, quotes and credit notes by reference, clients
   by name/email/VAT, products by name/category. LIKE metacharacters are escaped
   — unescaped, a typed `%` returns the whole database.
4. **Three report endpoints.** `GET /reports/payments` — the total the payments
   screen deliberately refused to print; its period is the day the money
   *arrived*, so it and `/reports/invoices` legitimately disagree across a
   quarter boundary. `GET /reports/clients` — the table
   `/clients/{id}/stats` would be called once per row to build.
   `GET /reports/products` — volume and mix by invoice *line*, free-text lines
   included, deliberately carrying no share of any invoice-level discount, so
   it sums higher than net revenue and must not be shown beside it unlabelled.
5. **`GET /alerts`.** Four rules on the server: overdue (partial payments leave
   only the remainder), forgotten drafts, business clients with no VAT number,
   and the company's own identifiers. Codes and context dicts, no prose — the
   sentence is the frontend's. Stores nothing, schedules nothing.
6. **The Postgres constraint fix** — see §3.
7. **Quotes.** Own series (`Q-{prefix}{YYYY}/{NNNN}`, sequence scope `quote`),
   full state machine, derived expiry, and `convert` producing a **DRAFT**
   invoice so the gapless number is still consumed only by `issue()`. Wired into
   the authz matrix, the backup (schema_version 2, v1 files still restore) and
   search. Migration `165748c8c55f`; `alembic revision --autogenerate` reports no
   drift.
8. **Two guards found while reviewing the above.** A route-walking test that
   fails the suite if any new POST/PATCH/PUT/DELETE declares no permission —
   six exemptions, each with its reason written next to it. And a fix: the
   restore report counted quotes and then dropped them on the wire, because
   `RestoreReportResponse` had not grown the field.
9. **The gap ledger re-read.** Six `ia.ts` nodes claimed backend gaps this
   session closed — the exact failure mode the last note ended on. One of them,
   Client 360's "Risk flags", was half true: `GET /reports/clients` exists now
   but carries the money half and not the risk half, and the block says so.

---

## 3. The bug that was about to eat the first CI run

`invoices` and `credit_notes` each declare two unique constraints whose first
column is `organization_id`. The `uq` naming convention keys off the first
column only, so **both came out with the same name**:

    CONSTRAINT uq_invoices_organization_id UNIQUE (organization_id, company_id, reference),
    CONSTRAINT uq_invoices_organization_id UNIQUE (organization_id, company_id, sequence_global),

SQLite accepts that. PostgreSQL rejects the statement outright, so `create_all`
in the CI Postgres leg and the initial migration on the first Postgres
deployment would both have failed. Renamed in the models and in the initial
migration, which has only ever been applied to SQLite development databases
where the names are cosmetic.

**Not verified against a real Postgres** — `docker` is not installed on this
machine, so the evidence is the compiled DDL (`CreateTable(...).compile(dialect=
postgresql.dialect())`, which emits both constraints under one name), not a
failing run reproduced here. If the Actions tab shows the Postgres leg green
before 2026-08-28, this diagnosis is wrong and worth un-writing.

---

## 4. Open decisions — cheap now, expensive later

Carried over, minus the two this session settled (roles are now enforced; the
VAT category has a route). Still needing Henri:

1. **Approve or redraw the §11b nav cut for the remaining ten sections.**
   One reading, then a session of route work. Proposal ~100 entries → ~45.
2. **Tier naming final?** `free / starter / business / business_pro`.
3. **The Business Pro shell — decided in principle, unbuilt.** Needs design:
   seats, per-entity usage, consolidated reporting, member management.
4. **Seats are declared and unenforced.** `Meter.SEATS` is metered and visible;
   nothing consumes it, and there can be no invite flow without **B1**.
   *Related:* role enforcement now exists, but there is still no way to create a
   second user — so every organization is one owner, and the matrix is correct
   but unexercised in production.
5. **Graded features are presentation only — still undecided.** `vat_report`,
   `dashboard`, `search`, `pdf_customization`, `import_legacy`,
   `accountant_export` are read by the UI and refused by **no endpoint**. Anyone
   calling `GET /reports/vat` or the new `GET /search` directly gets the full
   thing on Free. `GET /search` was left ungated on purpose rather than by
   oversight; the note is in `api/routers/search.py`.
6. **Are quotes metered?** Shipped unmetered. `Meter.INVOICES` counts invoices,
   and billing someone for offers they did not win is a pricing decision, not a
   default. If quotes should have an allowance it is one line in the matrix plus
   a dependency on the create route.
7. **A quote PDF template.** The only entry still in `sales.quotes.missing`.
   It is wording (what a Belgian offer must say, in fr/nl/en), not code.
8. **Downgrade / lapsed-subscription contract.** Code behaviour is settled and
   tested. The legal treatment — retention after cancellation — belongs in the
   DPA before a cancellation flow is built.

---

## 5. Backend still open — everything left needs someone else

- **B1 — email.** Highest fan-out, and now the single biggest unblock: password
  reset, verification, sending an invoice, sending a *quote*, payment reminders,
  team invites, support inbox.
- **Peppol transport.** A procurement clock, not a coding task. See the previous
  note's §2: contact Access Point resellers, and you do not need to *be* one.
- **Checkout / Merchant-of-Record.** The provider is an adapter that writes
  `SubscriptionRow`; `resolve_tier()` already prefers it over
  `Organization.plan_tier`.
- **B2 — blob storage.** All 7 Documents areas, company branding, company
  documents. `Company.logo_key` is still a dangling reference.
- **Recurring invoices** — Starter+ in the matrix, with no model, scheduler or
  job runner behind it. The first thing here that needs a *runner*, not an
  endpoint.
- **Pro-forma invoices** — same shape as quotes and now much cheaper: the
  precedent for a second series that must not touch the invoice sequence is
  written, tested, and one migration old.

## 5b. Frontend work the backend just unblocked

Not backend, but this is where the value now is — four screens over endpoints
that exist:

- The alerts panel on the dashboard (`GET /alerts`).
- The ⌘K palette wired to `GET /search` (it still only navigates pages).
- A total on the payments report (`GET /reports/payments`), and the two report
  screens that now have endpoints behind them (`/reports/clients`,
  `/reports/products`).
- The whole quotes section (`sales.quotes`), which is now backend-complete.
- And the composer defaulting its VAT category from `GET /vat-treatment`,
  which is the one that changes what the product is legally capable of.

---

## 6. Watch items

- **`quota_guard`'s concurrency guarantee is unproven** until CI runs against
  Postgres (§1). On SQLite `with_for_update()` is a no-op.
- **The dev pair cannot produce a 402.** `scripts/dev_desktop_api.py` runs with
  `DESKTOP_MODE=true` and `_exempt()` skips every entitlement check. The fix is
  a second dev pair in non-desktop mode with an ordinary signup, not a change to
  `_exempt`. **The same flag does *not* hide the new 403s** — `api/authz` has no
  desktop exemption, because the desktop build bootstraps its single user as
  `owner`, which holds every permission.
- **`QuoteService.convert` spans two transactions.** The draft invoice is
  written by `InvoiceService`, then the quote is marked converted. If the second
  fails, the visible outcome is a draft beside a quote still reading `accepted`;
  the fix is to delete the draft and convert again.
- **`PdfService(branded=...)` defaults to `True`.** A call site that forgets it
  shows a footer rather than silently giving away the paid feature.
- **The invoice allowance is consumed at draft creation, not at issue** —
  deliberate. `POST /quotes/{id}/convert` creates a draft and is *unmetered*, so
  a signed offer is never refused for a commercial reason.
- **The architecture report is one session stale** (v0.10, previous HEAD). It
  will now under-report the backend by five endpoints and a whole aggregate.
- **This document's own failure mode.** A gap ledger is only as true as its last
  reading, and nothing re-reads it automatically. `ia.ts` was re-read on
  2026-08-28; `docs/ARCHITECTURE/` was not.

---

## 7. Scaffolded 2026-08-28, deliberately not integrated

Two features from `docs/` now have a skeleton in the tree. **Nothing is
wired** — no router registration, no migration, no `src/index.ts` export, no
route, no `ia.ts` node, no CSS import. Each directory has a README with what is
there, which decisions it already commits to, and the ordered integration
steps.

- **TVA Intelligence** (`docs/tva_feature_future.md`) →
  [`core/tva/`](../core/tva/README.md) — state machine, domain models,
  document validation, Belgian classification rules, aggregation. All pure, no
  I/O. 31 tests in `tests/core/tva/` (suite is now **423**, was 392).
  Frontend panels in [`frontend-react/src/tva/`](../frontend-react/src/tva/README.md).
- **Invoice Workspace + Template Studio** (`docs/build_template_feature_future.md`) →
  [`frontend-react/src/workspace/`](../frontend-react/src/workspace/README.md) —
  the four-step composer, its live preview, and the block-based template model
  including the issued-invoice snapshot.

Three decisions were made while scaffolding, and are worth confirming or
reversing before anything is built on them:

1. **The TVA analyzer has no single "recoverable" total** — confirmed and
   potential are separate, and `estimated_payable` uses only the confirmed
   half. Enforced by the absence of the field.
2. **Template appearance is a choice among semantic tokens, not a colour
   picker.** A hex field on a template puts the palette bypass into a database
   row where the guard test cannot see it. This is a real reduction in what
   users can do.
3. **An issued invoice carries a `TemplateSnapshot`.** Editing a template must
   not restyle documents already sent. Cheap now, expensive after the first
   thousand invoices.

Both scaffolds are English-only: `t()` takes a closed `MessageKey` union, and
inventing fr/nl/en/es invoice terminology badly is worse than deferring it.

### Integration is ON HOLD — Henri, 2026-08-28

**Do not wire these into the app.** Henri has seen the invoice builder running
and called it good progress but *not what he had in mind*; the shape needs
another pass with him before anything is connected. Integration also waits on
an audit — `docs/BillGen_Professional_Audit_System_Final_Specification.docx`
appeared in `docs/` the same day and is presumably it, but that was not
confirmed and this session did not read it.

So: the READMEs' "integrating it" sections are a plan, not a queue. A future
session that finds this scaffold and helpfully mounts it has done the wrong
thing.

The one exception already in the tree is the **dev-only preview** at
`/_preview` (`frontend-saas/src/pages/PreviewRoute.tsx` plus one guarded
`<Route>` in `App.tsx`). It exists so the components can be looked at; it owns
no IA node, is absent from a production build (verified against
`dist/assets/`), and deleting those two things removes it entirely.
