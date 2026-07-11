# Component Library — Isolated Build

> **Looking for a specific component?** [COMPONENTS.md](COMPONENTS.md) is the
> per-component reference: description, file, props, usage example, keyboard
> behavior — plus the one-page design-language cheat sheet. This README tells
> the story (slices, decisions, integration steps).

Slices so far:
1. **Nav header + buttons** — LogoMark, HomeButton, Button, IconButton,
   CreateBillButton, TopNav, LoadingScreen, IconChip + 13 icons.
2. **Layout + forms** — Card, PageHeader, Field, TextInput, Textarea, Select,
   Checkbox, RadioGroup, Switch, SearchBar.
3. **Premium rendering** (no new components, styles only) — 3D button faces
   (gradient + outer shadow + inset highlight, hover lifts / press sinks),
   glassmorphism cards (layered transparency + backdrop blur + hover tilt)
   over a brand-tinted gradient backdrop (`--bg-app-backdrop`), plus a
   consistent type scale (title/section/label/input/helper), letter-spacing
   rules (titles −1.5%, body 0, buttons +1%) and roomier spacing (fields
   ~22px apart, inputs ~13px inside, cards ~28px padding). All of it lives
   as `--bg-*` tokens in `styles/tokens.additions.css` + the "premium
   rendering (slice 3)" block in `styles/components.additions.css`.
4. **Satoshi + Geist Mono + glass icons** (styles only) — `styles/fonts.css` +
   `styles/fonts/` load Satoshi (variable woff2, 300–900; source:
   `docs/Satoshi_Complete`, Fontshare license) as the UI face via
   `--bg-font-sans`, and Geist Mono (variable TTF; source: `docs/Geist_Mono`,
   OFL) for numbers & identifiers via `--bg-font-mono`: the `.bg-num`
   utility (amounts, VAT, invoice/client IDs) plus automatic mono +
   `tabular-nums` on `.bg-totals dd` and `.bg-kpi-card__value`. IconChip tones became tinted glass (semi-transparent
   gradients + backdrop blur + 1px inner ring + inner bottom shade); static
   chips have no pointer feedback — hover/press only exists on the clickable
   wrappers (HomeButton, IconButton). To integrate: copy `fonts.css` + the
   `fonts/` folder into `frontend-react/src/styles/` and import it before
   `tokens.css`, then set `font-family: var(--bg-font-sans)` on the app body.
5. **Feedback & overlays** — Modal (overlay glass: elevation 2 of the adopted
   trio page-glass / overlay-glass / pressed-inset), ConfirmDialog, Banner
   (info/success/warn/danger), Toast + ToastStack (dark glass, bottom-right),
   EmptyState, ErrorState, ProgressBar (determinate + indeterminate sweep).
6. **Henrioutai standard compliance** (no new components, styles only; per
   Henri's ecosystem spec 2026-07-10) — soft focus rings everywhere
   (`--bg-focus-ring-color`, no browser outlines left), radii token scale
   sm 6 / md 8 / lg 10 / xl 12 (+ `--bg-radius-surface` 16 for glass) mapped
   to Button sizes, 80ms ease-in press with `scale(0.98)` on every pressed
   state, per-size button typography (Satoshi Medium sm/md, Semibold lg/xl,
   tracking −0.2…−0.5px — **supersedes** the slice-3 "+1%" rule), TopNav
   depth (shadow-sm + 2–4% gradient) plus `variant="translucent" | "glass"`,
   icon size tokens 16/20/24 with idle opacity .8 → 1 on hover for clickable
   icons, and px/py spacing token pairs 12/6 · 16/8 · 20/10 · 24/12 mapped
   to sizes (button heights stay authoritative for optical vertical rhythm).
7. **Data display** — Table (sortable header affordance with caret + aria-sort,
   numeric columns right-aligned in `.bg-num` mono, clickable rows, empty
   slot), List (leading chip / two-line text / trailing slot), Badge (the
   five invoice statuses draft/issued/paid/partially_paid/voided with
   canonical labels + generic tones, tone dot + contrast ring), Tooltip
   (CSS-only dark glass pill, hover/focus-within, 150ms intent delay),
   Skeleton (text/block/circle shimmer, aria-hidden).
8. **P0 closure — app shell & account** — Menu (dropdown primitive: overlay
   glass, arrow-key focus, Esc/outside-click/select closes, focus returns to
   trigger; `triggerClassName` composes with bg-button classes), AccountMenu
   (avatar trigger + identity header + app-supplied entries; drop into
   TopNav's new `accountSlot` prop), AppShell (brand backdrop + sticky nav
   slot + centered content column default/wide/full). This closes the
   universal-checklist P0 set: sidebar-nav is intentionally retired (topbar
   absorbs it, see below), forward/back is IconButton + Back/ForwardIcon +
   PageHeader's back, and the home/landing screen is a composition of
   AppShell + cards (demoed in the preview), not a primitive.
9. **Dark mode** (styles only — the closing pass of the P0 set) — one
   token-layer remap in `tokens.additions.css` under
   `:root[data-bg-theme="dark"]`; zero component-CSS changes, which is what
   the token-only color rule was for. Set `data-bg-theme="dark"` on `<html>`
   to activate (the preview's ☾ chip does exactly that; a real theme
   switcher is P1). Slate surfaces/glass, lighter status hues (new raw
   red/amber 300–400 scale entries), shadows rebuilt on black (ink is light
   in dark, so ink-derived shadows would glow), hover lightens instead of
   darkens, backdrop keeps the three brand glows. Validated across every
   batch in the preview.
10. **P1 nav & data** — Breadcrumbs (ancestor links + inert current page),
    Tabs (underline switcher, roving tabindex, counts, icons), Pagination
    (windowed numbers with ellipses, mono digits, 1-based), KpiCard
    (premium upgrade of the flat base .bg-kpi-card: 2–4% sheen data
    surface, trend delta with positiveIsGood semantics), Avatar (initials
    chip or image, sm/md/lg, accent/navy/neutral).
11. **P1 forms** — Combobox (searchable closed list: type-to-filter,
    Up/Down + Enter, aria-activedescendant, × clears, hints per option),
    DatePicker (overlay-glass month grid, Monday-first per Belgian
    convention, dd/mm/yyyy display over ISO values, min/max bounds,
    arrow-key day walking, Today/Clear footer), FileUpload (drag-and-drop +
    click-to-browse, file chips with size + remove, multiple/accept).
12. **P1 overlays & flow** — Drawer (edge-anchored overlay glass, right/left,
    md/lg, pinned footer, Esc/backdrop close), Stepper (numbered wizard
    trail, check on done, accent halo on current, completed steps clickable
    via onStepClick), StatusTimeline (vertical trail for the Peppol
    lifecycle: done/current/upcoming/failed, pulsing current dot, mono
    timestamps), CommandPalette (⌘K overlay: substring filter over
    label+keywords, sections, ↑↓/↵/Esc, kbd-hint footer; controlled — the
    app binds the hotkey). `.bg-kbd` ships here; the Kbd component follows
    in the utility batch.
13. **P1 settings & utility** — Segmented (the shared
    pick-one primitive), ThemeSwitcher (light/dark over Segmented; app
    flips data-bg-theme), LanguageSwitcher (FR/NL/EN codes in mono),
    SettingsShell (section rail + content; hosts Import data and Activity
    log per the nav decision), NotificationCenter (bell + overlay-glass
    panel, unread halo, mark-all-read), SuccessState (draw-in check,
    .bg-state family), Kbd, CopyButton (clipboard + 1.6s check flip,
    execCommand fallback).
14. **P1 closers — NOW the P1 set is complete** (slice 13 claimed it early;
    a line-by-line checklist audit found five stragglers) — ContextMenu
    (right-click positional menu reusing the Menu popup + entries, clamps
    to the viewport), OrgSwitcher (the company switcher as a real
    component: avatar + name trigger, listbox with active check and "New
    company" footer; replaced the raw <select> placeholder in the TopNav
    demo), HelpBubble (floating support launcher, bottom-LEFT — toasts own
    bottom-right; HelpIcon finally does its job), ChartWrapper
    (lib-agnostic frame: title/legend/actions/caption + loading/empty
    states, data-surface sheen), Divider (plain hr or labeled
    start/center). P2 and app-specific compositions (invoice line editor,
    VAT picker) are the only things left beyond this.

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
    Card.tsx                     — bordered container: header/body/footer slots (slice 2)
    PageHeader.tsx               — back + title/subtitle + primary action row (slice 2)
    Field.tsx                    — label + hint/error wrapper around any input (slice 2)
    TextInput.tsx / Textarea.tsx / Select.tsx — text inputs on the existing
                                   .bg-field__input classes, + invalid state (slice 2)
    Checkbox.tsx / RadioGroup.tsx — native choice inputs with built-in labels/hints (slice 2)
    Switch.tsx                   — role="switch" instant boolean, CSS track+thumb (slice 2)
    SearchBar.tsx                — query input: icon, clear ×, Enter submits (slice 2)
    Modal.tsx / ConfirmDialog.tsx / Banner.tsx / Toast.tsx — overlays & status (slice 5)
    EmptyState.tsx / ErrorState.tsx / ProgressBar.tsx — states & progress (slice 5)
    Table.tsx                    — sortable data table, mono numeric columns (slice 7)
    List.tsx                     — stacked list: chip + two-line text + trailing (slice 7)
    Badge.tsx                    — invoice-status + generic-tone tags (slice 7)
    Tooltip.tsx                  — CSS-only dark glass tooltip (slice 7)
    Skeleton.tsx                 — shimmer placeholders: text/block/circle (slice 7)
    Menu.tsx                     — dropdown primitive, overlay glass + keyboard nav (slice 8)
    AccountMenu.tsx              — avatar-triggered account dropdown (slice 8)
    AppShell.tsx                 — outer frame: backdrop + sticky nav + content column (slice 8)
    Breadcrumbs.tsx              — path trail, current page inert (slice 10)
    Tabs.tsx                     — underline section switcher, roving tabindex (slice 10)
    Pagination.tsx               — windowed page numbers + prev/next (slice 10)
    KpiCard.tsx                  — metric + trend delta, premium data surface (slice 10)
    Avatar.tsx                   — initials chip or image, three tones (slice 10)
    Combobox.tsx                 — searchable select, keyboard-complete (slice 11)
    DatePicker.tsx               — calendar popup, Monday-first, ISO in/out (slice 11)
    FileUpload.tsx               — dropzone + file chips (slice 11)
    Drawer.tsx                   — slide-in side panel, overlay glass (slice 12)
    Stepper.tsx                  — numbered wizard trail (slice 12)
    StatusTimeline.tsx           — vertical lifecycle trail, Peppol-ready (slice 12)
    CommandPalette.tsx           — ⌘K search + quick actions (slice 12)
    Segmented.tsx                — pick-one strip, shared primitive (slice 13)
    ThemeSwitcher.tsx / LanguageSwitcher.tsx — Segmented wrappers (slice 13)
    SettingsShell.tsx            — settings rail + content layout (slice 13)
    NotificationCenter.tsx       — bell + notification panel (slice 13)
    SuccessState.tsx             — positive outcome, draw-in check (slice 13)
    Kbd.tsx / CopyButton.tsx     — shortcut hint + copy-with-confirmation (slice 13)
    ContextMenu.tsx              — right-click positional menu (slice 14)
    OrgSwitcher.tsx              — company/workspace switcher (slice 14)
    HelpBubble.tsx               — floating support launcher, bottom-left (slice 14)
    ChartWrapper.tsx             — lib-agnostic chart frame (slice 14)
    Divider.tsx                  — plain or labeled section break (slice 14)
  index.additions.ts           — new export lines to append to src/index.ts
  open-preview.cmd             — DOUBLE-CLICK THIS to check components yourself:
                                  installs deps if needed, starts Vite on :5174,
                                  opens the browser. Close the window to stop.
  preview/                     — standalone Vite+React gallery, see below
```

## Testing components individually

`preview/` is a real, runnable app — a gallery that renders every component
live (hoverable, clickable, animated), plus a "Last action" strip that
updates when you interact with anything, so you can confirm handlers
actually fire without opening devtools.

**Easiest way: double-click `open-preview.cmd`** in this folder — it
installs dependencies on first run, starts Vite, and opens your browser.
Or manually:

```
cd "docs/frontent build/component-library"
npm install          # one-time; own node_modules, isolated from the monorepo
npm run typecheck    # tsc across components/ + preview/ — currently clean
npm run preview:dev  # starts Vite on http://localhost:5174
```

**Batches, not one long page.** The gallery is split into selectable
batches — toggle chips in the sticky bar (Brand & identity · Icons ·
Buttons & actions · Navigation · Layout · Forms), with "newest slice" and
"all" shortcuts. The newest slice is selected by default, and the selection
persists in the URL hash (e.g. `#layout,forms`), so a reload or a shared
link keeps it. Each new slice of components must be added as its own batch
in `preview/src/App.tsx` (gallery files live in `preview/src/galleries/`).

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
