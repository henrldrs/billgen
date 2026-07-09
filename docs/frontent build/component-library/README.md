# Component Library — Isolated Build (nav header + buttons, first slice)

**This folder is not wired into any build.** Nothing here is imported by
`frontend-react`, `frontend-saas`, or `frontend-electron`. It's isolated
output — `.tsx`/`.css` files in the exact shape that would later be copied
into the real `@billgen/ui` package (`frontend-react/src/`), reviewed, and
connected on purpose. Treat this folder the way `COMPONENT_BUILDER_APP_BLUEPRINT.md`
describes the eventual component-builder tool's output: real code, not yet
dropped in.

Written from scratch per the "no imports from the web" rule — nothing here
comes from `docs/REF Invoice Dashboard Theme` (the Facturo shadcn demo) or
any other library. Shape/behavior only borrowed as reference, never code.

## What's in here

```
component-library/
  package.json + tsconfig.json — tooling ONLY (react/vite/typescript deps, own
                                  node_modules, own package-lock.json). Not the
                                  real @billgen/ui package.json — just what's
                                  needed to typecheck and preview this folder.
  styles/
    tokens.additions.css       — new --bg-* tokens to append to tokens.css
    components.additions.css   — new .bg-* classes to append to components.css
    tokens.base.css            — PREVIEW-ONLY mirror of the real tokens.css
    components.base.css        — PREVIEW-ONLY mirror of the real components.css
                                  (base.css files exist so the preview renders
                                  correctly; they are not meant to be copied
                                  anywhere — the real base files already exist
                                  in frontend-react/src/styles/)
  components/
    LogoMark.tsx                — the real logo, retokenized (navy/accent)
    HomeButton.tsx               — logo as the home button
    Button.tsx                   — FULL REPLACEMENT for the existing file (adds variants/sizes)
    IconButton.tsx               — icon-only trigger (search, bell, etc.)
    CreateBillButton.tsx         — the "+" CTA: grows on hover, shines on click
    TopNav.tsx                   — the header, now carrying primary nav links too (see below)
    LoadingScreen.tsx            — logo "printing invoices", for page/panel transitions
    icons/
      IconChip.tsx               — faux-3D "raised chip" wrapper (gradient + highlight + shadow)
      IconChip and 13 icon components (DashboardIcon, SettingsUserIcon, HelpIcon,
      PolicyIcon, SupportIcon, BackIcon, ForwardIcon, CompanyIcon, UpgradeIcon,
      NotificationsIcon, LanguageIcon, SearchIcon, PlusIcon) + index.ts barrel
  index.additions.ts           — new export lines to append to src/index.ts
  preview/                     — standalone Vite+React gallery, see below
```

## Testing components individually

`preview/` is a real, runnable app — a gallery page that imports every
component from `components/` and renders it live (hoverable, clickable,
animated), plus a "Last action" strip that updates when you interact with
anything, so you can confirm handlers actually fire without opening devtools.

```
cd "docs/frontent build/component-library"
npm install          # one-time; own node_modules, isolated from the monorepo
npm run typecheck    # tsc across components/ + preview/ — currently clean
npm run preview:dev  # starts Vite on http://localhost:5174
```

The gallery covers: `LogoMark` at multiple sizes; `HomeButton` at every size;
`IconChip` across every tone × size; all 13 ported icons; `Button` across
every variant and size; `IconButton` with/without the unread dot and across
tones; `CreateBillButton` (hover to watch it grow, click to watch it shine);
a fully assembled `TopNav` with sample nav links you can click to move the
active state (simulating route changes without a router); and a live
`LoadingScreen`.

This whole `preview/` folder — including its `node_modules` and
`package-lock.json` — is disposable scaffolding for testing. It never gets
copied into the real repo; only `components/`, `styles/*.additions.css`, and
`index.additions.ts` do (see below).

## Design decisions carried over from the plan

- **Tokens only.** Every color in every file here is a `var(--bg-*)` /
  `var(--brand-*)` reference or a literal white/black (the one exception the
  real `components.css` already allows). Nothing hardcodes hex.
- **Icon 3D = CSS/SVG faux-3D**, not WebGL — a gradient-filled chip with an
  inset highlight and a drop shadow. No new dependency.
- **The "+" create-bill button** grows on `:hover` (`transform: scale`) and
  sweeps a `::after` gradient shine on click, cleaned up via
  `onAnimationEnd` — no animation library.
- **The loading screen** is the logo with small rounded-rect "invoice"
  sheets sliding out beneath it on a staggered CSS loop.

## Nav redesign: topbar absorbs the sidebar

Original plan mounted `TopNav` *alongside* the existing SaaS sidebar. On
review that leaves two navigation surfaces doing overlapping jobs. Per
feedback: **if the topbar is in use, every link that lived in the sidebar
moves into the topbar, and the sidebar becomes obsolete** — not something
this library should keep building for. `TopNav.tsx` now accepts an optional
`links: TopNavLink[]` prop and renders a second row of primary nav links
(icon + label, active-state tint) directly under the title/actions row.
Everything the SaaS shell's sidebar carried today (Dashboard, Clients,
Products & services, New invoice, Invoices, Activity log, Import data,
Company details) maps onto that `links` array when this gets connected —
that mapping is app-specific and belongs in `frontend-saas`, not in this
app-agnostic library, so it isn't hardcoded here.

## How this gets connected later (not done yet)

1. Copy `components/*.tsx` (including `icons/`) into `frontend-react/src/components/`.
2. Append `styles/tokens.additions.css` into `frontend-react/src/styles/tokens.css`.
3. Append `styles/components.additions.css` into `frontend-react/src/styles/components.css`.
4. Replace `frontend-react/src/components/Button.tsx` with this folder's `Button.tsx`.
5. Append `index.additions.ts` into `frontend-react/src/index.ts`.
6. In `frontend-saas/src/pages/AppShell.tsx`: mount `TopNav` with the `links`
   array built from today's sidebar nav items, then remove the `<aside>`
   sidebar block.
7. `npm run typecheck` + `npm run test --workspace @billgen/ui`, then
   browser-verify.

None of steps 1–6 have been done — this session only produced the isolated
files below.
