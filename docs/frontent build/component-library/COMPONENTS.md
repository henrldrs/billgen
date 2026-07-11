# Component Reference — @billgen/ui (isolated build)

Every component in the library: what it is, where it lives, how to call it.
This is the lookup document; [README.md](README.md) tells the story (slices,
design decisions, how the folder gets connected to the real apps later).

**How to import.** Today (isolated build) components import relatively:
`import { Button } from "./components/Button";`. After integration every
component is a named export of `@billgen/ui` — the exact export lines are
staged in [index.additions.ts](index.additions.ts). All prop interfaces are
exported too (`ButtonProps`, `TableColumn`, …).

**See everything live:** double-click `open-preview.cmd` → gallery on
`localhost:5174`. Batches are toggleable chips; the ☾/☀ chip flips dark mode;
the "Preview batch" line on each entry below says where to look.

---

## Design language in one page

- **Tokens only.** Components never hardcode color. Layer 1: raw brand scales
  (`--brand-green-*`, `--brand-slate-*`, `--brand-red/amber-*`). Layer 2:
  semantic tokens (`--bg-*`) — the only thing components consume. Re-skinning
  an app = remapping layer 2 (see `styles/tokens.additions.css`).
- **Dark mode** = set `data-bg-theme="dark"` on `<html>`. One token remap,
  zero component changes. ThemeSwitcher is the ready-made control for it.
- **Three elevations, never a fourth:**
  1. *Page glass* — Cards and chrome (blur 20, `--bg-glass-*`)
  2. *Overlay glass* — Modal, Drawer, Menu, popups (blur 24,
     `--bg-glass-overlay-*`, `--bg-shadow-overlay`)
  3. *Pressed inset* — `--bg-shadow-button-pressed`
- **Data surfaces are near-opaque** (Table, KpiCard, ChartWrapper): solid
  surface + 2–4% sheen, no blur. Glass is for chrome, not data.
- **Type:** Satoshi for UI (`--bg-font-sans`); Geist Mono + `tabular-nums`
  for numbers & identifiers via the **`.bg-num`** utility (amounts, VAT,
  IBAN, invoice/client IDs, dates-as-data). Buttons: Medium (sm/md),
  Semibold (lg/xl), negative tracking −0.2…−0.5px by size.
- **Radii scale:** sm 6 / md 8 / lg 10 / xl 12 px mapped to sizes;
  `--bg-radius-surface` (16px) for glass surfaces.
- **Interaction:** hover 120ms ease-out; press 80ms ease-in + scale(0.98);
  focus = soft green ring (`--bg-focus-ring-color`), never a browser outline.
  Every animation respects `prefers-reduced-motion`.
- **Utilities:** `.bg-num` (mono numerics), `.bg-kbd` (key chips),
  `.bg-muted` (soft text, base css).
- **No portals.** Popups render in place (`position: absolute/fixed`).
  Parent containers with `overflow: hidden` clip them — keep that in mind
  around Tooltip, Menu, Combobox, DatePicker.

---

## Index

| Component | File | What it is | Preview batch |
|---|---|---|---|
| LogoMark | `components/LogoMark.tsx` | The BillGen mark, token-recolored | Brand & identity |
| HomeButton | `components/HomeButton.tsx` | Logo as the home button | Brand & identity |
| LoadingScreen | `components/LoadingScreen.tsx` | Logo "printing invoices" transition | Brand & identity |
| IconChip | `components/icons/IconChip.tsx` | Tinted-glass chip around any icon | Icons |
| 13 icon components | `components/icons/*.tsx` | Hand-drawn SVG icon set | Icons |
| Button | `components/Button.tsx` | The action primitive, 7 variants × 4 sizes | Buttons & actions |
| IconButton | `components/IconButton.tsx` | Icon-only trigger on a chip | Buttons & actions |
| CreateBillButton | `components/CreateBillButton.tsx` | The "+" CTA — grows, shines | Buttons & actions |
| TopNav | `components/TopNav.tsx` | Global header; links replace a sidebar | Navigation |
| Card | `components/Card.tsx` | Glass content container | Layout |
| PageHeader | `components/PageHeader.tsx` | Back + title + page action row | Layout |
| Field | `components/Field.tsx` | Label + hint/error wrapper | Forms |
| TextInput / Textarea / Select | `components/TextInput.tsx` etc. | Native inputs, invalid state | Forms |
| Checkbox / RadioGroup | `components/Checkbox.tsx` etc. | Choice inputs with built-in labels | Forms |
| Switch | `components/Switch.tsx` | Instant-effect boolean | Forms |
| SearchBar | `components/SearchBar.tsx` | Query input: icon, clear, Enter | Forms |
| Modal | `components/Modal.tsx` | Centered overlay glass | Feedback & overlays |
| ConfirmDialog | `components/ConfirmDialog.tsx` | "Are you sure?" gate | Feedback & overlays |
| Banner | `components/Banner.tsx` | Persistent page-level status | Feedback & overlays |
| Toast + ToastStack | `components/Toast.tsx` | Transient dark-glass pill | Feedback & overlays |
| EmptyState / ErrorState | `components/EmptyState.tsx` etc. | Nothing-here vs request-failed | Feedback & overlays |
| ProgressBar | `components/ProgressBar.tsx` | Determinate / indeterminate | Feedback & overlays |
| Table | `components/Table.tsx` | Sortable data table, mono numerics | Data display |
| List | `components/List.tsx` | Chip + two-line text + trailing rows | Data display |
| Badge | `components/Badge.tsx` | Invoice statuses + generic tags | Data display |
| Tooltip | `components/Tooltip.tsx` | CSS-only dark glass tooltip | Data display |
| Skeleton | `components/Skeleton.tsx` | Shimmer placeholders | Data display |
| Menu | `components/Menu.tsx` | Dropdown primitive, keyboard-complete | App shell & account |
| AccountMenu | `components/AccountMenu.tsx` | Avatar dropdown with identity header | App shell & account |
| AppShell | `components/AppShell.tsx` | Backdrop + sticky nav + content column | App shell & account |
| Breadcrumbs | `components/Breadcrumbs.tsx` | Path trail, inert current page | P1: nav & KPIs |
| Tabs | `components/Tabs.tsx` | Underline switcher, roving tabindex | P1: nav & KPIs |
| Pagination | `components/Pagination.tsx` | Windowed page numbers | P1: nav & KPIs |
| KpiCard | `components/KpiCard.tsx` | Metric + trend delta | P1: nav & KPIs |
| Avatar | `components/Avatar.tsx` | Initials chip or image | P1: nav & KPIs |
| Combobox | `components/Combobox.tsx` | Searchable closed-list select | P1: forms |
| DatePicker | `components/DatePicker.tsx` | Calendar popup, ISO in/out | P1: forms |
| FileUpload | `components/FileUpload.tsx` | Dropzone + file chips | P1: forms |
| Drawer | `components/Drawer.tsx` | Slide-in side panel | P1: overlays & flow |
| Stepper | `components/Stepper.tsx` | Numbered wizard trail | P1: overlays & flow |
| StatusTimeline | `components/StatusTimeline.tsx` | Vertical lifecycle trail (Peppol) | P1: overlays & flow |
| CommandPalette | `components/CommandPalette.tsx` | ⌘K search + quick actions | P1: overlays & flow |
| Segmented | `components/Segmented.tsx` | Pick-one strip (shared primitive) | P1: settings & utility |
| ThemeSwitcher | `components/ThemeSwitcher.tsx` | Light/dark toggle | P1: settings & utility |
| LanguageSwitcher | `components/LanguageSwitcher.tsx` | FR/NL/EN locale picker | P1: settings & utility |
| SettingsShell | `components/SettingsShell.tsx` | Settings rail + content layout | P1: settings & utility |
| NotificationCenter | `components/NotificationCenter.tsx` | Bell + notification panel | P1: settings & utility |
| SuccessState | `components/SuccessState.tsx` | Positive outcome, draw-in check | P1: settings & utility |
| Kbd | `components/Kbd.tsx` | Key-combo chip | P1: settings & utility |
| CopyButton | `components/CopyButton.tsx` | Copy with check confirmation | P1: settings & utility |
| ContextMenu | `components/ContextMenu.tsx` | Right-click positional menu | P1: closers |
| OrgSwitcher | `components/OrgSwitcher.tsx` | Company/workspace switcher | P1: closers |
| HelpBubble | `components/HelpBubble.tsx` | Floating support launcher | P1: closers |
| ChartWrapper | `components/ChartWrapper.tsx` | Lib-agnostic chart frame | P1: closers |
| Divider | `components/Divider.tsx` | Plain or labeled section break | P1: closers |

---

## Brand & identity

### LogoMark
The BillGen mark as an inline SVG, recolored from raw hex to `--bg-navy` /
`--bg-accent` so it retints with the token layer (including dark mode).

- **File:** `components/LogoMark.tsx` · **Exports:** `LogoMark`, `LogoMarkProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `number` | `28` | Height in px; width derives from the native aspect ratio |
| …rest | `SVGProps<SVGSVGElement>` | — | Everything except `viewBox/width/height` passes through |

```tsx
<LogoMark size={40} />
```

### HomeButton
The logo on a neutral IconChip, acting as the app's home button. Lives at the
left edge of TopNav.

- **File:** `components/HomeButton.tsx` · **Exports:** `HomeButton`, `HomeButtonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onNavigateHome` | `() => void` | — | Click handler |
| `size` | `"sm" \| "md" \| "lg"` | `"lg"` | Chip size |

```tsx
<HomeButton onNavigateHome={() => navigate("/")} />
```

**Behavior & a11y:** real `<button>` with `aria-label="Home"`; hover lifts the
chip, press sinks it, soft focus ring.

### LoadingScreen
Full-page/panel transition state — the logo with invoice "sheets" printing out
beneath it on a staggered CSS loop.

- **File:** `components/LoadingScreen.tsx` · **Exports:** `LoadingScreen`, `LoadingScreenProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `"Loading…"` | Text under the animation |

```tsx
<LoadingScreen label="Fetching your invoices…" />
```

**Behavior & a11y:** `role="status"` + `aria-live="polite"`; animation slows
under reduced motion.

---

## Icons

### IconChip
Tinted-glass chip wrapper around any icon: semi-transparent gradient +
backdrop blur + inner ring + bottom shade. Static chips have **no** pointer
feedback by design — hover/press lives on the clickable wrappers
(HomeButton, IconButton, AccountMenu trigger).

- **File:** `components/icons/IconChip.tsx` · **Exports:** `IconChip`, `IconChipProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | required | The icon |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 28 / 36 / 44 px |
| `tone` | `"accent" \| "navy" \| "neutral"` | `"neutral"` | Sets chip tint + icon ink |
| `shape` | `"chip" \| "circle"` | `"chip"` | Rounded square vs circle |
| `active` | `boolean` | `false` | Pressed-in look |

```tsx
<IconChip tone="accent" size="lg"><DashboardIcon /></IconChip>
```

### Icon set (13)
Hand-drawn SVG components, no props (plain `<svg>` sized by the surrounding
CSS, colored by `currentColor`; accent strokes use the `.icon-accent` class so
chips can retint them).

- **Files:** `components/icons/*.tsx`, barrel `components/icons/index.ts`
- **Names:** `DashboardIcon`, `SettingsUserIcon`, `HelpIcon`, `PolicyIcon`,
  `SupportIcon`, `BackIcon`, `ForwardIcon`, `CompanyIcon`, `UpgradeIcon`,
  `NotificationsIcon`, `LanguageIcon`, `SearchIcon`, `PlusIcon`
- ⚠ Placeholders pending Henri's sketches: Products & services (currently
  UpgradeIcon), Import (ForwardIcon), Activity (SearchIcon).

```tsx
import { PolicyIcon } from "./components/icons";
```

---

## Buttons & actions

### Button
The action primitive. 3D face on primary (gradient + colored shadow + inset
highlight), raised secondary/outline/danger, chromeless ghost/link/plain.
Hover lifts, press sinks + scales.

- **File:** `components/Button.tsx` · **Exports:** `Button`, `ButtonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"primary" \| "secondary" \| "danger" \| "outline" \| "ghost" \| "link" \| "plain"` | `"primary"` | `danger` is the destructive variant |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Sets height, radius, tracking, weight |
| `children` | `ReactNode` | required | Label |
| …rest | `ButtonHTMLAttributes` | — | `onClick`, `disabled`, `type`, … |

```tsx
<Button onClick={save}>Save invoice</Button>
<Button variant="danger" size="sm" onClick={voidInvoice}>Void</Button>
```

### IconButton
Icon-only trigger on an IconChip — bell, search, row overflow.

- **File:** `components/IconButton.tsx` · **Exports:** `IconButton`, `IconButtonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | required | The icon |
| `aria-label` | `string` | **required** | Enforced by the type — no nameless icon buttons |
| `size` / `tone` | as IconChip | `"md"` / `"neutral"` | |
| `dot` | `boolean` | `false` | Unread dot on the chip corner |
| …rest | `ButtonHTMLAttributes` | — | |

```tsx
<IconButton aria-label="Notifications" dot onClick={openNotifs}><NotificationsIcon /></IconButton>
```

**Behavior & a11y:** icon rests at 0.8 opacity → 1 on hover (clickable-icon rule).

### CreateBillButton
The "+" — BillGen's **single** creation entry point (nav rule: no "New
invoice" links anywhere else). Grows on hover, sweeps a shine on click.

- **File:** `components/CreateBillButton.tsx` · **Exports:** `CreateBillButton`, `CreateBillButtonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| …rest | `ButtonHTMLAttributes` (no children) | — | `onClick` is the one you want |

```tsx
<CreateBillButton onClick={() => openWizard()} />
```

**Behavior & a11y:** `aria-label="Create new bill"`; the shine is a one-shot
animation cleaned up via `onAnimationEnd` — one signature micro-interaction,
no motion sprawl.

---

## Navigation

### TopNav
The global header — and the primary nav: with `links` it replaces a sidebar
entirely (BillGen's nav decision). Solid variant has the 2–4% gradient +
shadow; translucent/glass blur content scrolling underneath (pair with
AppShell's sticky nav slot).

- **File:** `components/TopNav.tsx` · **Exports:** `TopNav`, `TopNavProps`, `TopNavLink`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | App/company name |
| `subtitle` | `string` | — | Small print under it |
| `links` | `TopNavLink[]` | `[]` | `{ key, label, icon?, active?, onClick?, href? }` — second row of primary nav |
| `variant` | `"solid" \| "translucent" \| "glass"` | `"solid"` | |
| `onNavigateHome` / `onCreateBill` / `onSearchClick` / `onNotificationsClick` / `onAvatarClick` | `() => void` | — | Action cluster handlers |
| `notificationCount` | `number` | `0` | >0 shows the bell dot |
| `avatarInitials` | `string` | — | Simple avatar button |
| `accountSlot` | `ReactNode` | — | Custom account trigger (AccountMenu) — replaces `avatarInitials` |
| `children` | `ReactNode` | — | Extra controls after the title (OrgSwitcher goes here) |

```tsx
<TopNav
  title="Acme Consulting"
  variant="translucent"
  links={[{ key: "dash", label: "Dashboard", icon: <DashboardIcon />, active: true }, …]}
  accountSlot={<AccountMenu … />}
  onCreateBill={openWizard}
>
  <OrgSwitcher … />
</TopNav>
```

**BillGen nav rule:** links = Dashboard · Clients · Products & services ·
Invoices · Company details. Import & Activity live in settings; "+" is the
only creator.

---

## Layout

### Card
Page-glass content container with optional header (title/subtitle/actions)
and footer. The base unit of most layouts; needs the brand backdrop behind it
(AppShell provides it) for the glass to read.

- **File:** `components/Card.tsx` · **Exports:** `Card`, `CardProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | required | Body |
| `title` / `subtitle` | `ReactNode` | — | Header renders only if title or actions exist |
| `actions` | `ReactNode` | — | Right side of the header |
| `footer` | `ReactNode` | — | Divided bottom strip |
| `padded` | `boolean` | `true` | `false` for flush bodies (tables, lists) |

```tsx
<Card title="Recent invoices" actions={<Button size="sm" variant="ghost">View all</Button>} padded={false}>
  <Table … />
</Card>
```

### PageHeader
Title row at the top of a page's content region: optional back IconButton,
title + subtitle, right-aligned primary action. Sits below TopNav, above Cards.

- **File:** `components/PageHeader.tsx` · **Exports:** `PageHeader`, `PageHeaderProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | required | Renders as the page `<h1>` |
| `subtitle` | `ReactNode` | — | |
| `actions` | `ReactNode` | — | Usually one Button |
| `onBack` | `() => void` | — | Renders the back button when set |

```tsx
<PageHeader title="Clients" actions={<Button onClick={addClient}>New client</Button>} />
```

---

## Forms

### Field
Label + input + hint/error wrapper. Wrap **any** input in it — TextInput,
Select, Combobox, DatePicker, Segmented all fit.

- **File:** `components/Field.tsx` · **Exports:** `Field`, `FieldProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | required | |
| `htmlFor` | `string` | — | id of the inner input (label wiring) |
| `hint` | `ReactNode` | — | Helper line; hidden while `error` shows |
| `error` | `ReactNode` | — | Renders with `role="alert"`; also set `invalid` on the input |
| `required` | `boolean` | — | Appends the * marker |
| `children` | `ReactNode` | required | The input |

```tsx
<Field label="VAT number" htmlFor="vat" required error={vatError}>
  <TextInput id="vat" className="bg-num" invalid={!!vatError} value={vat} onChange={…} />
</Field>
```

### TextInput · Textarea · Select
Native `<input>` / `<textarea>` / `<select>` on the `.bg-field__input` look
(inset shadow, focus ring, invalid state). All native props pass through.

- **Files:** `components/TextInput.tsx`, `Textarea.tsx`, `Select.tsx`
- **Exports:** `TextInput(Props)`, `Textarea(Props)`, `Select(Props)`, `SelectOption`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `invalid` | `boolean` | — | All three: red border + ring, sets `aria-invalid` |
| `rows` | `number` | `3` | Textarea |
| `options` | `SelectOption[]` (`{value,label,disabled?}`) | — | Select; or pass `<option>` children |
| `placeholder` | `string` | — | Select: disabled first option |

```tsx
<Select placeholder="Pick a VAT rate" options={[{ value: "21", label: "21 %" }, …]} />
```

For a *searchable* select use **Combobox** instead.

### Checkbox
Boolean with built-in label + hint (multi-select-capable; form semantics).

- **File:** `components/Checkbox.tsx` · **Exports:** `Checkbox`, `CheckboxProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | required | Clickable |
| `hint` | `ReactNode` | — | Second line |
| …rest | native input props | — | `checked`, `onChange`, `disabled`, … |

```tsx
<Checkbox label="Peppol delivery" hint="Send through the network on issue." checked={v} onChange={…} />
```

### RadioGroup
Single-select from a closed set, rendered as native radios.

- **File:** `components/RadioGroup.tsx` · **Exports:** `RadioGroup(Props)`, `RadioOption`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | required | Groups the radios |
| `options` | `RadioOption[]` (`{value,label,hint?,disabled?}`) | required | |
| `value` / `onChange` | `string` / `(v) => void` | — | Controlled |
| `direction` | `"column" \| "row"` | `"column"` | |
| `disabled` | `boolean` | — | Whole group |

### Switch
Instant-effect boolean (vs Checkbox = submitted-with-a-form boolean).
`role="switch"` button; CSS track + thumb.

- **File:** `components/Switch.tsx` · **Exports:** `Switch`, `SwitchProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `checked` / `onChange` | `boolean` / `(next) => void` | required | Controlled |
| `label` | `ReactNode` | — | Clickable; or give `aria-label` |
| `disabled` | `boolean` | — | |

```tsx
<Switch checked={reminders} onChange={setReminders} label="Payment reminders" />
```

### SearchBar
Dedicated query input: leading icon, clear × once there's text, Enter
submits, Esc clears. Controlled or uncontrolled.

- **File:** `components/SearchBar.tsx` · **Exports:** `SearchBar`, `SearchBarProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` / `onValueChange` | `string` / `(v) => void` | — | Omit `value` for uncontrolled |
| `onSubmit` | `(v) => void` | — | Fired on Enter |
| `placeholder` | `string` | `"Search…"` | |
| `disabled` | `boolean` | — | |

---

## Feedback & overlays

### Modal
Centered overlay glass (elevation 2) over a dimmed, blurred backdrop — for
focused tasks. For side detail use Drawer; for a yes/no gate use ConfirmDialog.

- **File:** `components/Modal.tsx` · **Exports:** `Modal`, `ModalProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | required | |
| `onClose` | `() => void` | — | Esc/backdrop/× all call it; omit to force a footer action |
| `title` | `ReactNode` | required | |
| `children` | `ReactNode` | required | Body |
| `footer` | `ReactNode` | — | Right-aligned buttons |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 420 / 560 / 760 px max |

```tsx
<Modal open={open} onClose={close} title="Edit client" footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={save}>Save</Button></>}>…</Modal>
```

### ConfirmDialog
"Are you sure?" gate — a small Modal with Cancel/Confirm prewired.

- **File:** `components/ConfirmDialog.tsx` · **Exports:** `ConfirmDialog`, `ConfirmDialogProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` / `title` / `children` | | required | children = the consequence text |
| `onConfirm` / `onCancel` | `() => void` | required | |
| `confirmLabel` / `cancelLabel` | `string` | `"Confirm"` / `"Cancel"` | |
| `danger` | `boolean` | — | Destructive confirm button |

```tsx
<ConfirmDialog open={open} danger title="Void invoice 2026-0042?" confirmLabel="Void invoice" onConfirm={doVoid} onCancel={close}>
  This can't be undone — the invoice keeps its number but becomes legally void.
</ConfirmDialog>
```

### Banner
Persistent page-level status (info/success/warn/danger). Transient feedback
belongs in Toast.

- **File:** `components/Banner.tsx` · **Exports:** `Banner`, `BannerProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `"info" \| "success" \| "warn" \| "danger"` | `"info"` | danger renders `role="alert"` |
| `title` | `ReactNode` | — | Bold lead-in |
| `children` | `ReactNode` | required | Message |
| `onDismiss` | `() => void` | — | Renders the × |

### Toast + ToastStack
Transient dark-glass pill, bottom-right. Presentational — the app owns the
list and the timers.

- **File:** `components/Toast.tsx` · **Exports:** `Toast(Props)`, `ToastStack(Props)`

| Prop (Toast) | Type | Default | Notes |
|---|---|---|---|
| `tone` | `"success" \| "error" \| "info"` | `"info"` | Dot color |
| `message` | `ReactNode` | required | |
| `onDismiss` | `() => void` | — | |

```tsx
<ToastStack>{toasts.map(t => <Toast key={t.id} tone={t.tone} message={t.msg} onDismiss={() => drop(t.id)} />)}</ToastStack>
```

### EmptyState · ErrorState
Nothing-here vs request-failed — visually related (`.bg-state`), semantically
distinct. See also SuccessState.

- **Files:** `components/EmptyState.tsx`, `ErrorState.tsx`

| Prop | Type | Default | Notes |
|---|---|---|---|
| EmptyState: `title` | `ReactNode` | required | + `icon` (usually IconChip), `description`, `action` |
| ErrorState: `title` | `ReactNode` | `"Something went wrong"` | + `description`, `onRetry`, `retryLabel`; renders `role="alert"` |

```tsx
<EmptyState title="No invoices yet" description="Create your first invoice and it will show up here." action={<Button onClick={openWizard}>New invoice</Button>} />
<ErrorState description="The server didn't answer." onRetry={refetch} />
```

### ProgressBar
Determinate fill or indeterminate sweep.

- **File:** `components/ProgressBar.tsx` · **Exports:** `ProgressBar`, `ProgressBarProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `number` (0–100) | — | Omit → indeterminate |
| `label` | `string` | — | Accessible name |
| `showValue` | `boolean` | — | % readout (determinate only, mono) |

---

## Data display

*(Data surfaces: near-opaque, no glass.)*

### Table
Sortable, scannable rows. Presentational — the caller owns sorting (flip
`sort`, reorder `rows`). Numeric columns right-align in mono automatically.

- **File:** `components/Table.tsx` · **Exports:** `Table(Props)`, `TableColumn`, `TableSort`, `SortDirection`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `TableColumn<T>[]` | required | `{ key, label, numeric?, sortable?, render?, width? }` |
| `rows` | `T[]` | required | |
| `rowKey` | `(row) => string \| number` | required | |
| `sort` / `onSortChange` | `TableSort` / `(next) => void` | — | `{ key, direction: "asc" \| "desc" }` |
| `onRowClick` | `(row) => void` | — | Rows get hover + pointer |
| `empty` | `ReactNode` | — | Replaces the body when `rows` is empty |

```tsx
<Table
  columns={[
    { key: "id", label: "Invoice", sortable: true, render: r => <span className="bg-num">{r.id}</span> },
    { key: "status", label: "Status", render: r => <Badge status={r.status} /> },
    { key: "total", label: "Total", numeric: true, sortable: true, render: r => euro(r.total) },
  ]}
  rows={sorted} rowKey={r => r.id} sort={sort} onSortChange={setSort} onRowClick={openInvoice}
/>
```

**Behavior & a11y:** sortable headers are buttons with `aria-sort` + a
two-way caret; wrap lives in `.bg-table-wrap` (horizontal scroll).

### List
Simpler vertical rows: leading chip, primary/secondary text, trailing slot.
Rows with `onClick` render as real buttons.

- **File:** `components/List.tsx` · **Exports:** `List(Props)`, `ListItemData`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `ListItemData[]` | required | `{ key, primary, secondary?, leading?, trailing?, onClick? }` |

```tsx
<List items={[{ key: "acme", leading: <IconChip tone="accent" size="md"><SettingsUserIcon /></IconChip>, primary: "Acme Consulting BV", secondary: <span className="bg-num">BE 0123.456.789</span>, trailing: <Badge tone="warn">2 overdue</Badge>, onClick: open }]} />
```

### Badge
Status/category label. `status` covers the invoice lifecycle 1:1 with the
backend and supplies canonical labels; `tone` covers everything else.

- **File:** `components/Badge.tsx` · **Exports:** `Badge(Props)`, `BadgeTone`, `InvoiceStatus`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `status` | `"draft" \| "issued" \| "paid" \| "partially_paid" \| "voided"` | — | Wins over `tone`; children optional (auto label) |
| `tone` | `"neutral" \| "info" \| "success" \| "warn" \| "danger"` | `"neutral"` | Generic tags |
| `children` | `ReactNode` | — | Custom label |

```tsx
<Badge status="partially_paid" />   // → "Partially paid", amber
<Badge tone="info">peppol</Badge>
```

### Tooltip
CSS-only dark-glass tooltip on hover/focus-within, 150ms intent delay. For
short clarifying phrases — not for content that must be clickable.

- **File:** `components/Tooltip.tsx` · **Exports:** `Tooltip`, `TooltipProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | required | The bubble text |
| `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | |
| `children` | `ReactNode` | required | The element being explained |

```tsx
<Tooltip label="Structured communication — Belgian payment reference."><span className="bg-num">+++123/4567/89012+++</span></Tooltip>
```

**Behavior & a11y:** wired via `aria-describedby`; shows on keyboard focus
too. No portal — beware `overflow: hidden` ancestors.

### Skeleton
Shimmer placeholders shaped like the content they precede.

- **File:** `components/Skeleton.tsx` · **Exports:** `Skeleton`, `SkeletonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"text" \| "block" \| "circle"` | `"text"` | |
| `lines` | `number` | `1` | text only; last line runs short |
| `width` / `height` | `string \| number` | — | |

```tsx
<Skeleton variant="circle" /> <Skeleton lines={3} /> <Skeleton variant="block" height="4.5rem" />
```

**Behavior & a11y:** `aria-hidden` — announce loading on the surrounding
region, not the bones.

---

## App shell & account

### Menu
The dropdown primitive (overlay glass). Click toggles; Esc, outside click and
selection close (focus returns to the trigger); ↑↓ move focus and skip
disabled items.

- **File:** `components/Menu.tsx` · **Exports:** `Menu(Props)`, `MenuEntry`, `MenuItemData`, `MenuSeparator`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `trigger` | `ReactNode` | required | Rendered inside the trigger button |
| `triggerClassName` | `string` | — | Composes — e.g. `"bg-button bg-button--secondary bg-button--sm"` makes the trigger a real-looking button |
| `triggerAriaLabel` | `string` | — | For icon-only triggers |
| `items` | `MenuEntry[]` | required | `{ key, label, icon?, hint?, danger?, disabled?, onSelect? }` or `{ type: "separator", key }` |
| `header` | `ReactNode` | — | Non-interactive block above the items |
| `align` | `"start" \| "end"` | `"start"` | Popup edge |

```tsx
<Menu trigger="Invoice actions" triggerClassName="bg-button bg-button--secondary bg-button--sm"
  items={[{ key: "pdf", label: "Download PDF", icon: <PolicyIcon />, onSelect: download },
          { type: "separator", key: "s" },
          { key: "void", label: "Void invoice", danger: true, onSelect: askVoid }]} />
```

### AccountMenu
Avatar-triggered account dropdown: identity header (name + email) over
app-supplied entries. Drop into TopNav's `accountSlot`; sign out should be a
`danger` entry.

- **File:** `components/AccountMenu.tsx` · **Exports:** `AccountMenu`, `AccountMenuProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | required | |
| `email` | `string` | — | |
| `initials` | `string` | required | Avatar chip |
| `items` | `MenuEntry[]` | required | Same shape as Menu |

### AppShell
The outer frame every screen renders inside: brand gradient backdrop (what
makes the glass read), sticky nav slot, centered content column. Mount once
around the router outlet.

- **File:** `components/AppShell.tsx` · **Exports:** `AppShell`, `AppShellProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `nav` | `ReactNode` | — | Typically `<TopNav variant="translucent" …>` |
| `width` | `"default" \| "wide" \| "full"` | `"default"` | 1100 / 1400 / unbounded px |
| `children` | `ReactNode` | required | Page content (`<main>`) |

```tsx
<AppShell nav={<TopNav … />}><Outlet /></AppShell>
```

---

## P1: nav & KPIs

### Breadcrumbs
Path trail for nested screens; ancestors are links/buttons, the last item is
the current page (`aria-current`, not clickable).

- **File:** `components/Breadcrumbs.tsx` · **Exports:** `Breadcrumbs(Props)`, `BreadcrumbItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `BreadcrumbItem[]` | required | `{ key, label, href?, onClick? }` — order = root → here |

```tsx
<Breadcrumbs items={[{ key: "d", label: "Dashboard", onClick: goHome }, { key: "c", label: "Clients", onClick: goClients }, { key: "x", label: "Acme Consulting BV" }]} />
```

### Tabs
Underline section switcher within a page. Roving tabindex: ←/→/Home/End move
focus **and** select, skipping disabled tabs. Panels are the caller's job.

- **File:** `components/Tabs.tsx` · **Exports:** `Tabs(Props)`, `TabItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TabItem[]` | required | `{ key, label, icon?, count?, disabled? }` — count renders as a mono pill |
| `activeKey` / `onChange` | `string` / `(key) => void` | required | Controlled |

```tsx
<Tabs items={[{ key: "overview", label: "Overview" }, { key: "invoices", label: "Invoices", count: 12 }]} activeKey={tab} onChange={setTab} />
```

### Pagination
Windowed page numbers with ellipses (a single hidden page renders as its
number, not "…"), prev/next arrows disabled at the edges. 1-based; caller
owns the state.

- **File:** `components/Pagination.tsx` · **Exports:** `Pagination`, `PaginationProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `page` / `pageCount` | `number` | required | |
| `onPageChange` | `(page) => void` | required | |
| `siblingCount` | `number` | `1` | Pages shown each side of current |

### KpiCard
Single metric + trend — the dashboard building block. Value renders in mono
automatically; the delta pill knows whether "up" is good.

- **File:** `components/KpiCard.tsx` · **Exports:** `KpiCard(Props)`, `KpiDelta`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | required | |
| `value` | `ReactNode` | required | Preformat amounts yourself |
| `delta` | `{ value: string, direction: "up" \| "down" \| "flat", positiveIsGood?: boolean }` | — | `positiveIsGood: false` for overdue-style metrics |
| `hint` | `ReactNode` | — | "vs. last month" |
| `icon` | `ReactNode` | — | Usually an IconChip |

```tsx
<KpiCard label="Outstanding" value="€ 4.235,50" delta={{ value: "+2", direction: "up", positiveIsGood: false }} hint="2 invoices awaiting payment" />
```

Lay several out with the `.bg-kpi-grid` class (base css).

### Avatar
Initials on a gradient chip (derived from the name), or an image. Deliberately
non-interactive — wrap it (Menu trigger, button) when it must act.

- **File:** `components/Avatar.tsx` · **Exports:** `Avatar`, `AvatarProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | required | Initials = first + last word |
| `src` | `string` | — | Image variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 28 / 36 / 44 px |
| `tone` | `"accent" \| "navy" \| "neutral"` | `"accent"` | Initials background |

---

## P1: forms

### Combobox
Searchable **closed-list** select on the field-input look (Field wraps it
unchanged). Type filters; ↑↓ + Enter select (disabled options skipped); Esc
closes; × clears.

- **File:** `components/Combobox.tsx` · **Exports:** `Combobox(Props)`, `ComboboxOption`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `options` | `ComboboxOption[]` | required | `{ value, label, hint?, disabled? }` — hint right-aligns (VAT number) |
| `value` / `onChange` | `string \| null` / `(v) => void` | required | Controlled; `null` = cleared |
| `placeholder` | `string` | — | |
| `invalid` / `disabled` | `boolean` | — | |
| `emptyText` | `string` | `"No matches."` | |
| `id` | `string` | — | For Field's `htmlFor` |

```tsx
<Combobox options={clients} value={clientId} onChange={setClientId} placeholder="Search clients…" />
```

**Behavior & a11y:** `role="combobox"` + `aria-activedescendant`; overlay-glass
listbox, max-height scroll.

### DatePicker
Calendar popup: Monday-first (Belgian convention), dd/mm/yyyy display over
**ISO `yyyy-mm-dd` values**, min/max bounds, arrow keys walk the day grid,
Today/Clear footer. Month label follows the browser locale.

- **File:** `components/DatePicker.tsx` · **Exports:** `DatePicker`, `DatePickerProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` / `onChange` | `string \| null` (ISO) | required | |
| `min` / `max` | `string` (ISO) | — | Inclusive; out-of-bounds days disable |
| `placeholder` | `string` | `"Pick a date"` | |
| `invalid` / `disabled` | `boolean` | — | |
| `id` | `string` | — | |

```tsx
<DatePicker value={dueDate} min={issueDate ?? undefined} onChange={setDueDate} />
```

### FileUpload
Drag-and-drop / click-to-browse. Keeps its own chip list (name + size +
remove) and reports the **full current list** through `onFiles` on every
change.

- **File:** `components/FileUpload.tsx` · **Exports:** `FileUpload`, `FileUploadProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onFiles` | `(files: File[]) => void` | required | |
| `accept` | `string` | — | Native accept, e.g. `".csv,.xml"` |
| `multiple` | `boolean` | `false` | |
| `hint` | `ReactNode` | — | Small print in the zone |
| `disabled` | `boolean` | — | |

```tsx
<FileUpload multiple accept=".csv,.xml" hint="CSV or UBL XML, max 5 MB" onFiles={setFiles} />
```

---

## P1: overlays & flow

### Drawer
Edge-anchored overlay glass — detail views (invoice preview, client card)
without leaving the page. Sticky header, scrollable body, pinned footer.

- **File:** `components/Drawer.tsx` · **Exports:** `Drawer`, `DrawerProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` / `onClose` | `boolean` / `() => void` | required | Esc/backdrop/× close |
| `title` | `ReactNode` | required | |
| `children` | `ReactNode` | required | Body (scrolls) |
| `footer` | `ReactNode` | — | Pinned action row |
| `side` | `"right" \| "left"` | `"right"` | |
| `size` | `"md" \| "lg"` | `"md"` | 416 / 544 px |

```tsx
<Drawer open={open} onClose={close} title={<>Invoice <span className="bg-num">2026-0039</span></>} footer={<Button onClick={pay}>Record payment</Button>}>
  <StatusTimeline items={…} />
</Drawer>
```

### Stepper
Numbered horizontal wizard trail. Done steps show a check (clickable when
`onStepClick` is set — "go back and fix"), current gets the accent halo,
upcoming stays muted.

- **File:** `components/Stepper.tsx` · **Exports:** `Stepper(Props)`, `StepItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` | `StepItem[]` | required | `{ key, label, description? }` |
| `activeKey` | `string` | required | Everything before it = done |
| `onStepClick` | `(key) => void` | — | Enables clicking done steps |

```tsx
<Stepper steps={[{ key: "client", label: "Client" }, { key: "lines", label: "Lines" }, { key: "send", label: "Send" }]} activeKey={step} onStepClick={setStep} />
```

### StatusTimeline
Vertical lifecycle trail — built for Peppol (created → validated → sent →
delivered), generic for any lifecycle. Current dot pulses (reduced-motion
safe); failed goes red and stops the line.

- **File:** `components/StatusTimeline.tsx` · **Exports:** `StatusTimeline(Props)`, `TimelineItem`, `TimelineStatus`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TimelineItem[]` | required | `{ key, label, description?, timestamp?, status }`; status = `"done" \| "current" \| "upcoming" \| "failed"`; timestamps render mono |

```tsx
<StatusTimeline items={[
  { key: "v", label: "Validated", description: "EN 16931 schema OK", timestamp: "01/07 10:02", status: "done" },
  { key: "s", label: "Sent to access point", status: "current" },
  { key: "d", label: "Delivered", status: "upcoming" }]} />
```

### CommandPalette
⌘K overlay: substring filter over label + keywords, section grouping, ↑↓/↵,
Esc, kbd-hint footer. **Controlled** — the app binds the global hotkey and
owns `open`.

- **File:** `components/CommandPalette.tsx` · **Exports:** `CommandPalette(Props)`, `CommandItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` / `onClose` | `boolean` / `() => void` | required | |
| `commands` | `CommandItem[]` | required | `{ key, label, hint?, icon?, section?, keywords?, onRun }` |
| `placeholder` | `string` | `"Type a command or search…"` | |
| `emptyText` | `string` | `"Nothing matches."` | |

```tsx
useEffect(() => { /* bind Ctrl/⌘K → setOpen(v => !v) */ }, []);
<CommandPalette open={open} onClose={() => setOpen(false)} commands={[{ key: "new", label: "New invoice", section: "Create", hint: "N", onRun: openWizard }, …]} />
```

---

## P1: settings & utility

### Segmented
Compact pick-one strip (2–4 options) — the shared primitive behind
ThemeSwitcher and LanguageSwitcher; use directly for density, chart range,
any small exclusive choice.

- **File:** `components/Segmented.tsx` · **Exports:** `Segmented(Props)`, `SegmentedOption`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `options` | `SegmentedOption[]` | required | `{ value, label, icon?, disabled? }` |
| `value` / `onChange` | `string` / `(v) => void` | required | Controlled; typed generically over the value union |
| `ariaLabel` | `string` | **required** | It's a radiogroup |
| `size` | `"sm" \| "md"` | `"md"` | |

```tsx
<Segmented ariaLabel="Range" size="sm" value={range} onChange={setRange} options={[{ value: "6m", label: "6M" }, { value: "12m", label: "12M" }]} />
```

### ThemeSwitcher
Light/dark over Segmented (sun/moon icons). Controlled: persist the value and
flip `data-bg-theme` on `<html>` — the token layer does the rest.

- **File:** `components/ThemeSwitcher.tsx` · **Exports:** `ThemeSwitcher(Props)`, `ThemeValue`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `theme` / `onChange` | `"light" \| "dark"` / `(t) => void` | required | |
| `size` | `"sm" \| "md"` | `"md"` | |

```tsx
<ThemeSwitcher theme={theme} onChange={t => { setTheme(t); document.documentElement.dataset.bgTheme = t === "dark" ? "dark" : undefined; localStorage.setItem("theme", t); }} />
```

### LanguageSwitcher
Locale picker for the 2–3 locales the app actually ships (FR/NL, later EN) —
codes render uppercase in mono. Not a country dropdown.

- **File:** `components/LanguageSwitcher.tsx` · **Exports:** `LanguageSwitcher(Props)`, `LanguageOption`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `languages` | `LanguageOption[]` | required | `{ code, label? }` — label defaults to uppercased code |
| `value` / `onChange` | `string` / `(code) => void` | required | |
| `size` | `"sm" \| "md"` | `"md"` | |

### SettingsShell
Grouped-settings layout: section rail left, active section's content right
(stacks under 640px). In BillGen this hosts Company details — including
Import data and Activity log (the nav decision).

- **File:** `components/SettingsShell.tsx` · **Exports:** `SettingsShell(Props)`, `SettingsSection`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sections` | `SettingsSection[]` | required | `{ key, label, icon?, description? }` |
| `activeKey` / `onSectionChange` | `string` / `(key) => void` | required | |
| `children` | `ReactNode` | required | Content of the active section — caller switches on `activeKey` |

### NotificationCenter
Bell trigger (unread dot mirrors the list) + overlay-glass panel: unread
halo dots, tone colors, mono timestamps, optional mark-all-read. The app owns
the notification state.

- **File:** `components/NotificationCenter.tsx` · **Exports:** `NotificationCenter(Props)`, `NotificationItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `notifications` | `NotificationItem[]` | required | `{ key, title, description?, timestamp?, unread?, tone?, onClick? }`; tone = `"neutral" \| "success" \| "danger"` |
| `onMarkAllRead` | `() => void` | — | Renders the header action while unread > 0 |
| `emptyText` | `string` | `"You're all caught up."` | |

### SuccessState
Explicit positive outcome — invoice issued, payment landed. The check draws
itself in once (stroke animation, reduced-motion safe). Same `.bg-state`
family as Empty/ErrorState.

- **File:** `components/SuccessState.tsx` · **Exports:** `SuccessState`, `SuccessStateProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | required | |
| `description` / `action` | `ReactNode` | — | |

```tsx
<SuccessState title="Invoice 2026-0043 issued" description="Locked, numbered and ready." action={<Button onClick={view}>View invoice</Button>} />
```

### Kbd
Key-combo chip — `<Kbd>Ctrl</Kbd> <Kbd>K</Kbd>`. Renders a real `<kbd>` with
the `.bg-kbd` look (mono, inset bottom edge).

- **File:** `components/Kbd.tsx` · **Exports:** `Kbd`, `KbdProps` · Props: `children`.

### CopyButton
Copy-to-clipboard with inline confirmation: the icon flips to a green check
for ~1.6s. Async Clipboard API with an `execCommand` fallback for non-secure
contexts; a visually-hidden `role="status"` announces "Copied".

- **File:** `components/CopyButton.tsx` · **Exports:** `CopyButton`, `CopyButtonProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string` | required | Exact clipboard text — pass the normalized value (no spaces) |
| `label` | `string` | `"Copy"` | Accessible name + title |

```tsx
IBAN <span className="bg-num">BE71 0961 2345 6769</span> <CopyButton value="BE71096123456769" label="Copy IBAN" />
```

---

## P1: closers

### ContextMenu
Right-click positional menu — same entry shape and popup look as Menu.
Wrap the surface that owns the right-click (table row, card, list); the popup
opens at the cursor, clamped to the viewport. Left-click stays untouched.

- **File:** `components/ContextMenu.tsx` · **Exports:** `ContextMenu`, `ContextMenuProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `MenuEntry[]` | required | Same type as Menu |
| `children` | `ReactNode` | required | The right-clickable surface |

```tsx
<ContextMenu items={[{ key: "open", label: "Open", onSelect: open }, { type: "separator", key: "s" }, { key: "void", label: "Void invoice", danger: true, onSelect: askVoid }]}>
  <List items={…} />
</ContextMenu>
```

**Behavior & a11y:** focus lands on the first item; ↑↓ cycle; Esc, outside
mousedown, resize and window blur all close.

### OrgSwitcher
The company/workspace switcher: avatar + name trigger, listbox popup with the
active org checked, detail lines (VAT), optional "+ New company" footer.
Lives in TopNav's `children` slot.

- **File:** `components/OrgSwitcher.tsx` · **Exports:** `OrgSwitcher(Props)`, `OrgItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `orgs` | `OrgItem[]` | required | `{ key, name, detail? }` |
| `activeKey` / `onChange` | `string` / `(key) => void` | required | |
| `onCreateNew` | `() => void` | — | Renders the footer action |
| `createLabel` | `string` | `"New company"` | |

### HelpBubble
Floating support launcher — fixed **bottom-left** (bottom-right belongs to the
toast stack). Circular navy-glass button opens a small panel with intro text
and support links. Mount once in the app shell.

- **File:** `components/HelpBubble.tsx` · **Exports:** `HelpBubble(Props)`, `HelpLink`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | `"Need a hand?"` | |
| `children` | `ReactNode` | — | Intro text above the links |
| `links` | `HelpLink[]` | `[]` | `{ key, label, hint?, onSelect }` |

### ChartWrapper
The consistent frame around **any** chart (lib or hand-drawn SVG): title row,
swatch legend, actions slot, caption, built-in loading (Skeleton) and empty
states. Data surface — no glass.

- **File:** `components/ChartWrapper.tsx` · **Exports:** `ChartWrapper(Props)`, `ChartLegendItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | required | |
| `subtitle` / `caption` | `ReactNode` | — | Above / below the plot |
| `legend` | `ChartLegendItem[]` | `[]` | `{ key, label, color }` — color = a token: `"var(--bg-accent)"` |
| `actions` | `ReactNode` | — | Range Segmented, export Menu… |
| `children` | `ReactNode` | required | The chart; `<svg>/<canvas>` stretch to fill |
| `loading` | `boolean` | — | Skeleton block instead of the chart |
| `empty` | `ReactNode` | — | Rendered instead of the chart |
| `height` | `string \| number` | `220` | Plot area |

```tsx
<ChartWrapper title="Invoiced vs. paid" legend={[{ key: "i", label: "Issued", color: "var(--bg-accent)" }]} actions={<Segmented … />} loading={isLoading} empty={rows.length === 0 ? "No invoices yet." : undefined}>
  <MyChart data={rows} />
</ChartWrapper>
```

### Divider
Hairline section break — plain `<hr>`, or labeled (start/center) for grouping
lists by month, marking archives.

- **File:** `components/Divider.tsx` · **Exports:** `Divider`, `DividerProps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — | Uppercased small print on the line |
| `align` | `"start" \| "center"` | `"start"` | Label placement |

```tsx
<Divider /> · <Divider label="June 2026" /> · <Divider label="Archived" align="center" />
```

---

*Every component: token-only colors, both themes for free, verified in the
preview gallery. All props also carry `className` for composition unless
noted. Written from scratch — no third-party UI code.*
