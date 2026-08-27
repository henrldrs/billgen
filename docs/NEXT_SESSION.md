# Next session — TODO

Rewritten 2026-08-26 at the end of the entitlement-UI session (the previous
version of this file was consumed). Delete it once this one is consumed too; it
is a handover note, not a permanent document. The permanent map is
[HANDOFF.md](../HANDOFF.md) and the board is [ROADMAP_IA.md](ROADMAP_IA.md).

**State:** Python 298 passed, frontend **132** passed, ruff clean, four
workspaces typecheck.

---

## 0. The one-line summary

**The backend is still ahead of the UI, but no longer by twenty endpoints.**
The commercial layer now has a face (upgrade prompt, usage, plans) and the VAT
report finally has a screen. What is left in [§2](#2-the-frontend-backlog) is
eight ordinary screens over endpoints that already exist and already have hooks
— none of them blocked on anything.

---

## 1. FIRST — push the repo (`BGEN-OPS-01`) · blocked on Henri

Unchanged and still the only total-loss risk on the board. Everything else
assumes work that is backed up and continuously tested.

**Pre-push audit is done and the repo is clean:** no private keys, no
`sk_live`/`AKIA`/`ghp_`/Slack tokens in tracked content; `.gitignore` covers
`.env`, `*.pem`, `*.key`, `*.billgenlic`, `backups/`, `var/`, `*.db`; the three
tracked env files are all templates.

GitHub account: **`henrldrs`**. `gh` is **not installed** on this machine, so
the repo cannot be created from a session. Either:

- **A.** Henri creates an empty **private** repo `billgen` (no README, no
  gitignore, no licence) and pastes the URL → next session adds the remote,
  pushes `main` + the phase tags, and watches CI.
- **B.** `winget install --id GitHub.cli`, then `gh auth login` (opens a
  browser, so Henri must run it) → next session does all of it.

**Expect the first CI run to be an experiment.** `.github/workflows/ci.yml` has
never executed. Its Postgres leg is the first real test of the gapless-numbering
row lock and of `quota_guard`'s lock — both no-ops on SQLite. A red first run is
information, not a regression.

---

## 2. The frontend backlog

### 2a. The entitlement UI — **done 2026-08-26**

Kept here only so the next session knows what exists and does not rebuild it.

- `EntitlementBoundary` (mounted once per shell) subscribes to the React Query
  caches and turns **any** 402 into `UpgradeDialog`. No panel, hook or button
  in either shell contains payment logic, which was the point of the uniform
  402 body. A 403 deliberately does not land there.
- `UsagePanel` → `billing/usage`; `PlansPanel` → `billing/plan`, rendered from
  `GET /plans` so there is no copy of the matrix in TypeScript.
- Meter, tier, feature and grade names are translated through
  `tMeter`/`tTier`/`tFeature`/`tLevel`, each falling back to a humanised wire
  value so a backend newer than the UI degrades to an ugly label, not a blank.

### 2b. Screens for backend that has been sitting unused

| Screen | Endpoint(s) / hook | Note |
|---|---|---|
| ~~**VAT report**~~ | `useVatReport()` | **Done 2026-08-26.** Month/quarter/year, honest `covers` banner, foreign-currency exclusions declared, breakdown gated on `features.vat_report` — see [§3.6](#3-open-decisions). |
| ~~**Company edit form**~~ | `useUpdateCompany()`, `useCompanyValidation()` | **Done 2026-08-27.** `CompanySettingsPanel` — one panel, six sections (`profile/legal/vat/bank/numbering/defaults`), PATCH carrying only changed fields, per-field verdicts that drop themselves once the input differs from the saved value, Peppol banner from `missing_for_peppol`, template picker from `GET /pdf-templates`. Verified in the browser against a real 402-free desktop pair. |
| ~~**Credit notes**~~ | already fully wired | **Screen exists** (`CreditNotesPanel`, routed at `sales/credit-notes`) — this row was already stale when it was written. |
| ~~**Client 360**~~ | `useClientStats()`, `useClientTimeline()` | **Screen exists** (`Client360Panel`, routed at `customers/clients/:clientId`). Also stale as written. |
| **Payments report** | `usePaymentsList()` | Cross-invoice listing with date window. |
| **Invoices report** | `useInvoiceReport()` | Counts/money per effective status + monthly series. Kill the browser-side aggregation. |
| **Duplicate button** | `useDuplicateInvoice()` | One button on invoice detail. |
| **VAT-rate picker** | `useVatRates()` | `21/12/6/0` is still hardcoded in `InvoiceBuilderPanel`. Delete it. The **template** picker is done — the company defaults screen renders `GET /pdf-templates`. |
| **Catalog Services / Archived** | `useProducts({status, billingType})` | Server filters now; stop fetching everything. |

### 2c. Layer-6 experience work

Untouched and blocks on nothing — see [ROADMAP_IA.md §7](ROADMAP_IA.md).
`.bg-panel` never got the premium pass `.bg-card` got; `ChartWrapper` and
`HelpBubble` exist and have never been rendered.

---

## 3. Open decisions — cheap now, expensive later

1. **Tier naming is final?** `free / starter / business / business_pro`. Still
   trivial to rename until a real subscription references the string — and the
   UI no longer holds a copy of any tier name, so a rename is a server change
   plus four translation keys.
2. **The Business Pro shell (decided in principle 2026-08-26, unbuilt).** The
   top tier's differentiator is **an administration surface for the billing
   owner**, encoded as `team_administration: True` and
   `vat_report: "consolidated"`. **Nothing renders either.** Needs design: what
   does the billing owner see that a single-user account does not — seats,
   per-entity usage, consolidated reporting across companies, member
   management?
3. **Seats are declared and unenforced.** `Meter.SEATS` is metered and now
   *visible* on the usage screen, but nothing consumes it: there is no invite
   flow, and there cannot be one without **B1** (email).
4. **Roles are modelled and unenforced.** `core/models/user.py` has
   `Role = owner | admin | member | viewer`, the JWT carries it, `api/deps.py`
   exposes `current_role` — read in exactly one place (`/users/me`, to display
   it). **A `viewer` can void an invoice today.** When roles are enforced they
   must also be gated: `roles_permissions` is Business+ in the matrix.
5. **Downgrade / lapsed-subscription contract.** Code behaviour is settled and
   tested (over-limit keeps every record, refuses only new creation). The
   *legal* treatment — retention after cancellation — belongs in the DPA before
   a cancellation flow is built.
6. **Graded features are declared and unenforced — decide.** Meters and boolean
   features are guarded server-side. The graded ones (`vat_report`,
   `dashboard`, `search`, `pdf_customization`, `import_legacy`,
   `accountant_export`) are read by the UI to choose a variant and are refused
   by **no endpoint**. The VAT screen hides its per-rate breakdown below
   `"full"` on that basis: honest UX, but anyone calling
   `GET /reports/vat` directly gets the whole report on Free. Either add a
   graded server check or accept that these grades are presentation only —
   right now the product is silently choosing the second.

---

7. **Nav curation is decided, unbuilt** — [ROADMAP_IA §11b](ROADMAP_IA.md).
   The coverage-map nav (section overviews, full popup lists) is a build-time
   instrument and comes out. The rule is list-vs-record, not "remove the
   repetition". First and cheapest move: collapse the six `company/*` routes
   into one settings screen — `CompanySettingsPanel` already has `section="all"`,
   so it is five route deletions.
8. **Comments must not ship, and must not be deleted** —
   [ROADMAP_IA §11c](ROADMAP_IA.md). Strip on export, never in the tree; the
   SaaS bundle is already clean, the Electron artifact is not. Watch the
   docstring trap: FastAPI/Pydantic docstrings are published as the OpenAPI
   `description` and generate `api.d.ts`.

## 4. Backend still open, in rough value order

- **B1 — email.** Highest fanout in the product: password reset, verification,
  send invoice, payment reminders (BE three-step escalation), team invites,
  support inbox. Unblocks item 3 above.
- **Checkout / Merchant-of-Record.** Deliberately deferred. The provider is an
  adapter that writes `SubscriptionRow`; `resolve_tier()` already prefers it
  over `Organization.plan_tier` when its status is active/trialing/past_due, so
  nothing else has to change. Until it exists, six of the eight Billing areas
  have nothing to show and the plan screen has no "choose this plan" button.
- **B2 — blob storage.** All 7 Documents areas, company branding.
  `Company.logo_key` is a dangling reference *right now*.
- `GET /alerts` — server-side rules engine (overdue, clients missing VAT).
- `GET /search?q` — the palette navigates pages; it cannot find an invoice by
  number, which is what people actually reach for it to do.
- **Quotes** — own numbering series, must not touch the invoice sequence.
- Recurring invoices — `recurring_invoices` is Starter+ in the matrix and there
  is no model, no scheduler, no job runner behind it.
- Peppol **transport** (Access Point). The XML is Helger-validated and nothing
  transmits it.

---

## 5. Watch items

- **`quota_guard`'s concurrency guarantee is unproven** until CI runs against
  Postgres (item 1). On SQLite `with_for_update()` is a no-op.
- **The dev verification pair cannot produce a 402.** `scripts/dev_desktop_api.py`
  runs with `DESKTOP_MODE=true`, and `api/entitlements/deps._exempt()` exempts
  desktop mode from every entitlement check — the same flag that provides the
  credential-less login. So the upgrade dialog is covered by unit tests (real
  ApiClient, real 402 body, real modal) but has **never been seen in a
  browser**. If that matters, the fix is a second dev pair in non-desktop mode
  with an ordinary signup, not a change to `_exempt`.
- **`PdfService(branded=...)` defaults to `True`.** A new call site that forgets
  to pass it shows a footer rather than silently giving away the paid feature.
- **The invoice allowance is consumed at draft creation, not at issue** — a
  deliberate choice, because issuing is legally load-bearing and must never fail
  for a commercial reason. A deleted draft frees its slot.
