# Environment Reference — What's Where, In Plain Language

**Why this file exists.** Every UI session was starting with a full re-read
of `docs/` plus the frontend packages to rebuild context. This is that
context, written once. Read this instead of re-exploring the folder tree.

---

## Where the actual UI library lives

`frontend-react/` is **not** a demo or a leftover — its `package.json` name
is `@billgen/ui`. It's the one shared component package. Two apps consume it
identically:

- `frontend-saas/` — the public web app (browser, login/signup, hosted).
- `frontend-electron/` — the desktop app (Tauri shell around the same core).

Both import `@billgen/ui`'s components, styles, hooks, and API client rather
than defining their own. So: **new components go in `frontend-react/src/`,
never duplicated into the app folders.**

Inside `frontend-react/src/`:
- `components/` — the shared UI atoms (`Button`, `Field`, `Modal`, `Spinner`,
  `EmptyState` today).
- `panels/` — bigger, data-connected screens built from those atoms
  (`DashboardPanel`, `ClientsPanel`, `InvoiceBuilderPanel`, etc.).
- `styles/tokens.css` — the color/shape variables (see below).
- `styles/components.css` — the CSS classes those components use
  (`.bg-button`, `.bg-panel`, `.bg-modal`, …).
- `hooks/`, `lib/`, `providers/` — data fetching (React Query), the typed API
  client, auth.

## The token system (read `BRAND_TOKENS.md` for the full rules)

Two layers, one direction of truth:
1. **Raw palette** (`--brand-green-500`, `--brand-slate-700`, …) — the actual
   hex values. Components never touch these directly.
2. **Semantic tokens** (`--bg-accent`, `--bg-ink`, `--bg-sidebar`, …) — what
   components are allowed to reference. Re-skinning the whole library for a
   different app means remapping this layer only; component code never
   changes.

Canonical colors: green `#10B981` (actions/logo "Gen"), navy `#334155`
(structure/logo "Bill"), plus white/gray/ink for surfaces and text.

## Planning documents already in `docs/` (don't regenerate these)

- **`UNIVERSAL_COMPONENT_LIBRARY_CHECKLIST.md`** — the actual backlog. Every
  component worth building once and reusing across *any* future app (not
  just BillGen), split into Navigation / Layout / Data display / Forms /
  Feedback / Actions / Content / Settings / Utility, each tagged P0 (day-one
  need), P1 (once the app grows), or P2 (once it has real users). This is
  the plan of record for "what do we build" — new requests should be checked
  against it before inventing a new component category.
- **`SCAFFOLD_COMPONENTS_DASHBOARD.md`** — a detailed catalog (26 elements)
  of a *reference* dashboard screen: sidebar, header, KPI row, charts,
  tables. For each element it notes size/variant/radius/interaction and
  which real BillGen API endpoint would feed it (some confirmed against the
  architecture docs, some flagged `[verify]` since `api/` wasn't in scope
  when it was written). It also flags which two elements most need a real
  shape redesign tied to the logo: the sidebar brand tile and the primary
  "new invoice" CTA — both are exactly what this session's nav+button build
  addresses.
- **`COMPONENT_BUILDER_APP_BLUEPRINT.md`** — a *separate*, not-yet-started
  idea: a personal desktop tool (Tauri + React, "Figma-to-code" style) for
  visually designing components and exporting real `.tsx` files. This is
  future tooling, unrelated to building the components by hand right now.
  Don't confuse it with the actual component work.
- **`docs/SVG icon .txt`** — flat line-icon sketches (dashboard, settings,
  help, policy, support, back/forward, company switcher, upgrade,
  notifications, language). Colored with an old, deprecated hex pair
  (`#2ECC71`/`#0F172A` — the "Canva" palette `BRAND_TOKENS.md` explicitly
  says not to use). Treat these as shape references only; any port into a
  real component must retokenize the colors to `--bg-*` vars.
- **`docs/frontent build/logo_refractor/`** — the real logo asset pipeline:
  `billgen_icon.svg` (the two-tone navy/green mark, vector source of truth),
  plus rendered PNGs at several sizes and mask layers. This is the source
  for any "logo as a UI element" work (home button, loading screen, app
  icons).
- **`ARCHITECTURE/ADR-0001-three-layer.md`**, **`ADR-0002-invoice-lifecycle.md`**
  — backend architecture decisions (3-layer core/api/db separation, the
  draft→issued invoice lifecycle). Not UI, but explains *why* certain UI
  states exist (e.g. the DRAFT badge, issue/delete gating).

## The reference theme — "Facturo" (`docs/REF Invoice Dashboard Theme/`)

A full shadcn/ui + Tailwind dashboard demo, placeholder-branded "Facturo."
**This is a shape-and-behavior reference only.** Its component code (a
45-file shadcn primitive library) is explicitly out of scope — nothing gets
imported or copied from it, per the standing "build from Henri's drawings,
nothing from the web" rule. `SCAFFOLD_COMPONENTS_DASHBOARD.md` is the
catalog *of* this theme, already extracted into implementation-neutral
notes — read that doc, not the theme's source, when you need to know "what
did Facturo do here."

## `HANDOFF.md` — the whole-system map

The authoritative status document for the entire project (not just UI):
what phase the backend is at, the 3-layer architecture, every router/
service/model, test counts, environment/toolchain notes, known gaps. Two
things from it matter specifically for UI work:

1. **§0.1 / §9** track debts against the *actual* product demo — not the
   Facturo theme above, but a real prior app. Named debts include
   UX polish below "the demo's glassmorphism" and an unported agenda/
   VAT-reminder feature.
2. **The real demo repos are external and, as of this session, unreachable.**
   `HANDOFF.md` names `D:\CODING\audit-v2-react-exe` (the audited, shipped
   demo app) and `D:\CODING\FinanceFlow Bill Generator` (the approved Peppol
   reference) as comparison points. **This sandboxed session only has
   filesystem access to `C:` — `D:\CODING` does not exist here.** Any future
   "match the demo's UI" work needs one of: the relevant demo folders copied
   into this project tree (e.g. under a `reference/` folder), a session run
   with `D:` access, or the specific screens described/pasted directly.
   Don't assume this got inventoried — it hasn't yet.

Two docs `HANDOFF.md` still links to (`AUDIT_PROGRESS_vs_demo.md`,
`COMPARISON_demo_vs_new.md`) were deleted from `docs/` — their content was
consolidated into `HANDOFF.md` itself, so the links are stale but nothing
was lost.

## Quick pointers for next time

- Need to know what component to build next → `UNIVERSAL_COMPONENT_LIBRARY_CHECKLIST.md`.
- Need a shape/interaction reference for a specific dashboard element → `SCAFFOLD_COMPONENTS_DASHBOARD.md`.
- Need a color or spacing value → `BRAND_TOKENS.md` + `frontend-react/src/styles/tokens.css`.
- Need the logo → `docs/frontent build/logo_refractor/billgen_icon.svg`.
- Need overall project/backend status → `HANDOFF.md`.
- Need the real product demo for comparison → currently blocked, see above.
