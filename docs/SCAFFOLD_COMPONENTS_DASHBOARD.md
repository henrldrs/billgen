# BillGen — Dashboard Scaffold Component Spec

**Source.** `REF Invoice Dashboard Theme/src/app/App.tsx` — the assembled dashboard
screen only (the 45-file shadcn/ui primitive library sitting alongside it is
imported nowhere in this file and is out of scope for this pass). Branding in
the source is placeholder ("Facturo", fake companies/clients) — this doc
catalogs *shape and behavior*, not the placeholder content.

**API grounding.** Where an endpoint is stated in the architecture docs
(ADR-0002, `COMPARISON_demo_vs_new.md`, the Peppol integration blueprint) it is
marked **confirmed**. Everything else is a constructed, best-guess route
consistent with the router/service names that *are* documented, flagged
`[ADD ENDPOINT — verify]` so it can be corrected against the real
`api/routers/*.py` once that source is available to compare against.

**Classification vocabulary (standard terms, used throughout).**
- **Size:** `sm` ≈ 32px / `md` ≈ 36px / `lg` ≈ 40px / `xl` ≈ 44px+ (measured off the Tailwind height classes in the source, e.g. `h-8`/`h-9`/`h-10`)
- **Variant:** `filled` (solid brand-color fill) · `outline` (border, transparent/background fill) · `secondary` (muted fill) · `ghost` (no chrome until hover) · `link` (text-only) · `plain` (icon-only, no label)
- **Radius:** `none` / `sm` (4px) / `md` (8px) / `lg` (12px) / `full` (pill or circle)
- **States:** only the states that actually apply per component — `default / hover / active / focus-visible / disabled / loading`
- **Redesign flag:** carried over from the earlier button critique — marks every element still on the generic `rounded-md` shadcn default, i.e. a candidate for the next design pass, not yet redesigned here.

---

## Part 1 — Bare Scaffold Inventory (no logic, no API, structure only)

**Sidebar**
1. Brand mark (logo tile + wordmark)
2. Company switcher — trigger
3. Company switcher — option row (repeats per company)
4. Nav section label (eyebrow text)
5. Nav item (repeats ×4: Dashboard / Clients / Products / Bills)
6. Primary CTA — "New invoice"

**Header**
7. Page title + subtitle block
8. Search trigger (with keyboard-shortcut hint)
9. Notification bell (with unread indicator)
10. User avatar

**KPI row**
11. KPI card (repeats ×4: Revenue, VAT collected, Total invoices, Amount outstanding)
12. Trend indicator (nested in KPI card: arrow + delta text)

**Charts row**
13. Chart card (container: header + legend + body — repeats ×2)
14. Revenue & VAT area chart (chart body)
15. Legend swatch (nested: color chip + label)
16. Chart tooltip (hover-triggered popover)
17. VAT-breakdown pie chart (chart body)
18. Pie legend row (label + value, list variant of the legend)

**Bottom row**
19. Recent-bills table card (container + header + "view all" link)
20. Table header row (column labels)
21. Table body row (repeats per invoice)
22. Status badge (4 value-states: paid / pending / overdue / draft)
23. Row overflow trigger (hover-revealed `⋯` icon button)
24. Top-clients card (container + header)
25. Client rank row (repeats per client: rank badge + name + progress bar + growth indicator)
26. Mini comparison bar chart (month-over-month)

26 distinct elements, built from roughly 9 genuinely reusable components
(KPI card, status badge, nav item, chart card, legend swatch, table row,
client rank row, icon-button, and the two dropdown/menu patterns) plus a
handful of one-offs (brand mark, search trigger, avatar, primary CTA).

---

## Part 2 — Full Spec

### Sidebar

| # | Component | Code ref | What it is | Size | Variant | Radius | Interaction | Trigger | Redesign flag |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Brand mark | `App.tsx:170-177` | Logo tile (7×7 filled square, primary color) + wordmark, static identity anchor, top of sidebar | sm (28px tile) | filled | md | click → nav | Client-side nav to `/dashboard` (root). No API call. | Yes — square tile should carry the logo's folded-corner cut, not a plain rounded square |
| 2 | Company switcher — trigger | `App.tsx:181-193` | Full-width row showing active company name + id, chevron flips on open | md (h-auto, ~44px row) | secondary | md | click → toggles local dropdown state | No API on open. On **select** (row #3) it re-scopes the session. | Yes — generic secondary-fill row, no BillGen-specific shape |
| 3 | Company switcher — option row | `App.tsx:196-213` | One row per company in the org, repeats inside the open dropdown panel | sm (36px row) | ghost (hover→secondary) | md | click → select | `GET /api/companies/{company_id}/context` `[ADD ENDPOINT — verify]` — sets active `company_id` in the tenant context (ADR-0001: org→companies hierarchy, `organization_id` on every row); triggers refetch of KPI/chart/table data (#11, #14, #17, #21) | No |
| 4 | Nav section label | `App.tsx:218` | Micro eyebrow text, non-interactive divider label ("Navigation") | n/a | plain | n/a | passive | none | No |
| 5 | Nav item | `App.tsx:219-233` | Icon + label row, ×4 (Dashboard/Clients/Products/Bills), active state = tinted fill + chevron | md (h-10 row) | ghost (active→filled-tint) | md | click → route change | Dashboard → `GET /api/reports` (**confirmed name**, `COMPARISON_demo_vs_new.md` §"ReportingService + GET /reports"). Clients → `GET /api/clients` `[ADD ENDPOINT — verify]`. Products → `GET /api/products` `[ADD ENDPOINT — verify]`. Bills → `GET /api/invoices` (inferred — sibling of the **confirmed** `POST /invoices/{id}/issue` / `DELETE /invoices/{id}` in ADR-0002, same router file `api/routers/invoices.py`). | No — but active-state treatment (tint fill) is a reasonable pattern to keep |
| 6 | Primary CTA — new invoice | `App.tsx:238-241` | Full-width filled button, bottom of sidebar, only true "primary action" button on screen | lg (h-11 row) | filled | md | click → nav | Nav to `/invoices/new` (draft builder). On save: `POST /api/invoices` → `create_draft()` (**confirmed name**, ADR-0002: "no number, `status = DRAFT`, editable, deletable"). | **Yes — this is the exact "boxy rectangle" the earlier critique flagged.** Sole candidate for a pill/distinct-shape primary CTA per the logo's rounded "B" terminals. |

### Header

| # | Component | Code ref | What it is | Size | Variant | Radius | Interaction | Trigger | Redesign flag |
|---|---|---|---|---|---|---|---|---|---|
| 7 | Page title + subtitle | `App.tsx:250-253` | Static text block, current screen name + period/company context | n/a | plain | n/a | passive | none | No |
| 8 | Search trigger | `App.tsx:255-259` | Pill-shaped row with icon, placeholder text, and a `⌘K` key-hint badge | md (h-8) | secondary | md | click → opens command palette (local state) | On query submit: `GET /api/search?q=` `[ADD ENDPOINT — verify; no search service documented in any ADR]` | No — already reads as a distinct "search" shape, not a generic button |
| 9 | Notification bell | `App.tsx:260-263` | Icon-only square button with a small unread-dot overlay | sm (32px, icon `size-8`) | secondary | md | click → opens panel (local state) | `GET /api/notifications` `[ADD ENDPOINT — verify; no notification service documented anywhere in current docs]` | Yes — identical chrome to every other icon button on screen, no visual distinction for "has unread" beyond the dot |
| 10 | User avatar | `App.tsx:264-266` | Circular initials badge, tinted primary | sm (32px) | filled (tint) | full (circle) | click → opens account menu (local state) | No API on open. Menu items nav to `/settings/profile`, etc. | No — circle is already differentiated from the rest of the chrome |

### KPI row

| # | Component | Code ref | What it is | Size | Variant | Radius | Interaction | Trigger | Redesign flag |
|---|---|---|---|---|---|---|---|---|---|
| 11 | KPI card | `App.tsx:93-124`, instantiated `274-311` | Reusable card: label, icon chip, big mono value, sub-caption, trend row. Repeats ×4 (Revenue, VAT collected, Total invoices, Amount outstanding). | lg (card, p-5) | secondary card + tinted icon chip | md (lg on card, md on chip) | passive display, `hover:border` only | Data-bound on mount: `GET /api/reports` (**confirmed**, COMPARISON §"useKpi / useRevenue read real invoices") | No — card shape is fine; the icon-chip color coding (4 different tints) is arbitrary though, not tied to a BillGen semantic system |
| 12 | Trend indicator | `App.tsx:111-121` (nested in #11) | Up/down arrow + delta % + "vs last month" caption | n/a (text row) | plain (colored text) | n/a | passive | Same source as #11, no separate call | No |

### Charts row

| # | Component | Code ref | What it is | Size | Variant | Radius | Interaction | Trigger | Redesign flag |
|---|---|---|---|---|---|---|---|---|---|
| 13 | Chart card (container) | `App.tsx:317-333`, `357-361` | Wrapper: title, subtitle, inline legend, chart body. Repeats ×2 (revenue/VAT area, VAT-breakdown pie). | xl (col-span-2 / col-span-1, p-5) | secondary card | md | passive | none directly — see #14/#17 for the data call | No |
| 14 | Revenue & VAT area chart | `App.tsx:334-353` | Dual-series area chart (revenue HT + VAT), gradient fill, custom axes | n/a (chart canvas, h-200) | n/a | n/a | hover → tooltip (#16) | `GET /api/reports?series=revenue,vat&range=7m` — base route **confirmed**, query shape constructed `[ADD ENDPOINT — verify params]` | No |
| 15 | Legend swatch | `App.tsx:323-332` (nested) | Small color chip + series label, ×2 per chart | n/a | plain | sm (chip) | click (standard Recharts pattern) → toggles series visibility | Local UI state only, no API | No |
| 16 | Chart tooltip | `App.tsx:126-140` | Card-style popover on hover, shows series name + formatted value | sm (px-3 py-2.5) | secondary card | md | hover-triggered, passive | none — reads already-fetched chart data | No |
| 17 | VAT-breakdown pie chart | `App.tsx:362-371` | Donut chart, 4 VAT-rate segments | n/a (chart canvas, h-150) | n/a | n/a | hover → native Recharts tooltip | `GET /api/reports?breakdown=vat_rate` — base route **confirmed**, query shape constructed `[ADD ENDPOINT — verify params]` | No |
| 18 | Pie legend row | `App.tsx:372-382` | List variant of the legend: dot + label + formatted amount, one row per VAT rate | n/a | plain | n/a | passive | Same source as #17 | No |

### Bottom row

| # | Component | Code ref | What it is | Size | Variant | Radius | Interaction | Trigger | Redesign flag |
|---|---|---|---|---|---|---|---|---|---|
| 19 | Recent-bills table card | `App.tsx:390-439` | Card wrapper: header (title + "view all" link) + scrollable table | xl (col-span-2) | secondary card | md | "view all" = click → nav | Link navs to `/invoices` (full list) → same `GET /api/invoices` as nav item #5 | No |
| 20 | Table header row | `App.tsx:402-412` | Column labels: reference, client, HT amount, VAT, due date, status | n/a | plain | n/a | passive (no sort wired) | none — sorting, if added, would be client-side unless a `?sort=` param is added to `GET /api/invoices` | No |
| 21 | Table body row | `App.tsx:414-435` | One row per invoice: mono reference, client name, HT/VAT amounts, due date, status badge (#22), hover-revealed overflow trigger (#23) | md (py-3 row) | plain (hover→secondary/40 tint) | n/a | click row → nav | Nav to `/invoices/{id}` → `GET /api/invoices/{id}` (inferred sibling of the **confirmed** `POST /invoices/{id}/issue`) `[ADD ENDPOINT — verify]` | No |
| 22 | Status badge | `App.tsx:84-89`, rendered `423-426` | Pill label, 4 value-states (paid / pending / overdue / draft), color-coded | n/a (px-2 py-0.5) | outline (tinted border+bg) | full (pill) | passive, no click | **Not its own data call.** Per ADR-0002 §4: "Overdue is derived, not stored — `ISSUED && due_date < today && unpaid`." Paid/pending/draft come directly off the fetched `Invoice.status` / `Invoice.delivery_status` fields from #21's source. | No — already a pill, already status-semantic; genuinely the one component in this scaffold closest to a "BillGen-native" shape |
| 23 | Row overflow trigger | `App.tsx:428-432` | `⋯` icon button, opacity-0 until row hover | sm (14px icon, no visible chrome) | ghost | n/a | click → opens contextual menu (local state) | Menu items trigger real documented actions — see breakdown below | No |
| — | ↳ menu: Issue | (contextual action) | — | — | — | — | click | `POST /api/invoices/{id}/issue` — **confirmed**, ADR-0002 ("the load-bearing transition... assigns the gapless number, sets `status = ISSUED`") | — |
| — | ↳ menu: Delete (draft only) | (contextual action) | — | — | — | — | click | `DELETE /api/invoices/{id}` — **confirmed**, ADR-0002, repo-guarded to drafts only; issued invoices are never deletable | — |
| — | ↳ menu: Download PDF | (contextual action) | — | — | — | — | click | `GET /api/invoices/{id}/pdf` `[ADD ENDPOINT — verify]` — PDF engine confirmed to exist (`core/pdf/`, WeasyPrint+Jinja2 per COMPARISON §9), exact route not documented | — |
| — | ↳ menu: Export Peppol XML | (contextual action) | — | — | — | — | click | `POST /api/invoices/{id}/peppol/export` `[ADD ENDPOINT — verify]` — action confirmed as the audited `export_peppol` event (COMPARISON §7, `PeppolService.generate_invoice_xml()`), exact route not documented | — |
| — | ↳ menu: Mark paid | (contextual action) | — | — | — | — | click | `POST /api/invoices/{id}/payments` `[ADD ENDPOINT — verify]` — service confirmed to exist (`PaymentService.record()`, ADR-0002 §4: "today only manual `PaymentService.record()` exists"), exact route not documented | — |
| 24 | Top-clients card | `App.tsx:442-448` | Card wrapper, header only (no "view all") | lg (col-span-1) | secondary card | md | passive | none directly — see #25 | No |
| 25 | Client rank row | `App.tsx:450-473` | Rank badge (#), name, invoice count, progress bar (share of top client's revenue), growth % indicator | md (row) | plain, nested badge is `secondary` | md (badge) | click → nav | Nav to `/clients/{id}` → `GET /api/clients/{id}` `[ADD ENDPOINT — verify]`, sibling of constructed `GET /clients` (#5) | No |
| 26 | Mini comparison bar chart | `App.tsx:477-489` | 2-bar chart, current vs. previous month, revenue + VAT | n/a (h-80) | n/a | n/a | hover → tooltip | `GET /api/reports?compare=mom` — base **confirmed**, query shape constructed `[ADD ENDPOINT — verify params]` | No |

---

## Reading this document

- **Confirmed** endpoints/actions are pulled verbatim from `ADR-0002-invoice-lifecycle.md`, `COMPARISON_demo_vs_new.md`, and the Peppol integration blueprint — trust these as-is.
- **`[ADD ENDPOINT — verify]`** tags are constructed to be technically plausible (correct REST shape, correct resource nesting, named after services that *are* documented) but are not confirmed against real router source — the `api/` folder isn't in the connected workspace. Re-run this pass against `api/routers/*.py` once available and strip the tags that check out.
- **Redesign flags** are carried forward from the button-shape critique earlier in this conversation — they mark candidates for the next pass (shape language tied to the logo), not problems with this cataloging pass itself. Only 2 of 26 elements are flagged as needing real shape work (#1 brand tile, #6 primary CTA) plus 2 with looser chrome-uniformity notes (#2, #9) — the rest of the scaffold's boxiness is structural (cards, tables) rather than interactive, so it wasn't in scope for the original complaint.

*Next step: pick one flagged element (recommend starting with #6, the primary CTA) and design its replacement shape before touching the rest.*
