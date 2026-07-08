# Universal Component Library — What To Implement

**Scope.** Not what BillGen's reference scaffold currently uses (see
`SCAFFOLD_COMPONENTS_DASHBOARD.md` for that inventory) — this is the
app-agnostic component set worth building once, standardizing, and reusing
across every future project. Organized by category. Each item: what it is,
why it earns a place in a *personal* design system (not just "every app has
one"), and a rough build-priority tier.

**Priority tiers:** **P0** = needed by almost any app on day one · **P1** =
needed once the app has more than a couple of screens · **P2** = needed once
the app has users other than you (accounts, support, growth).

---

## 1. Navigation

| Component | What it is | Priority |
|---|---|:---:|
| Top nav bar | Global header: logo, primary nav, account/utility icons | P0 |
| Sidebar nav | Vertical nav with sections, active-state, collapsible | P0 |
| Breadcrumbs | Path trail for nested screens | P1 |
| Tab bar | Horizontal section switcher within a page | P1 |
| Forward / back buttons | Explicit history navigation, distinct from browser back | P0 |
| Pagination | Page-number or cursor-based list navigation | P1 |
| Command palette | `⌘K`-style global search + quick actions | P1 |
| Stepper / wizard nav | Numbered step indicator for multi-step flows (onboarding, checkout) | P1 |
| Bottom nav (mobile) | Fixed bottom tab bar for touch layouts | P2 |
| Context/right-click menu | Positional action menu on secondary click | P1 |

## 2. Layout & structure

| Component | What it is | Priority |
|---|---|:---:|
| App shell / frame | The outer skeleton every screen renders inside (nav + content region) | P0 |
| Page header | Title + subtitle + primary page action, consistent across screens | P0 |
| Card | Bordered content container, the base unit of most layouts | P0 |
| Panel / drawer | Slide-in side panel for secondary content without leaving the page | P1 |
| Modal / dialog | Centered overlay for focused tasks or confirmations | P0 |
| Split view / resizable panes | Two-region layout with a draggable divider | P2 |
| Empty state | What renders when a list/section has nothing in it yet | P0 |
| Section divider | Visual/semantic break between content groups | P1 |
| Home / landing screen | The default screen on app open — orientation, not necessarily data | P0 |

## 3. Data display

| Component | What it is | Priority |
|---|---|:---:|
| Table | Sortable, scannable rows of structured data | P0 |
| List | Simpler vertical row layout, no columns | P0 |
| Stat / KPI card | Single metric + trend, the dashboard building block | P1 |
| Chart wrapper | Consistent container (title, legend, tooltip) around any chart lib | P1 |
| Badge / tag | Small status or category label | P0 |
| Avatar | User/entity image or initials | P1 |
| Status timeline / stepper | Vertical progress trail (e.g. created → validated → sent → delivered) | P1 |
| Tooltip | Hover-triggered contextual info | P0 |
| Progress bar / loader | Determinate or indeterminate progress indicator | P0 |
| Skeleton | Loading placeholder shaped like the content it precedes | P1 |

## 4. Forms & inputs

| Component | What it is | Priority |
|---|---|:---:|
| Text input | Single-line text field | P0 |
| Textarea | Multi-line text field | P0 |
| Select / dropdown | Single choice from a closed list | P0 |
| Combobox / autocomplete | Searchable select, open or closed list | P1 |
| Checkbox | Boolean, multi-select-capable | P0 |
| Radio group | Boolean, single-select-only | P0 |
| Switch / toggle | Instant-effect boolean (vs. checkbox = form-submitted boolean) | P0 |
| Slider | Numeric range input | P2 |
| Date picker | Calendar-based date selection | P1 |
| File upload / dropzone | Drag-and-drop or click-to-browse file input | P1 |
| Search bar | Dedicated query input, usually with debounce + clear button | P0 |
| Form validation / inline error | Field-level error message + error state styling | P0 |

## 5. Feedback & overlays

| Component | What it is | Priority |
|---|---|:---:|
| Toast / snackbar | Transient, non-blocking status message | P0 |
| Alert / banner | Persistent, page-level status message (warning, info, error) | P0 |
| Confirmation dialog | "Are you sure?" gate before a destructive/irreversible action | P0 |
| Error state | What renders when a request fails, distinct from empty state | P0 |
| Success state | Explicit positive-outcome confirmation (not just a toast) | P1 |

## 6. Actions

| Component | What it is | Priority |
|---|---|:---:|
| Primary button | The one emphasized action per section | P0 |
| Secondary button | Supporting action, lower visual weight | P0 |
| Icon button | Chrome-light, icon-only trigger | P0 |
| Split / dropdown button | Primary action + attached menu of related actions | P2 |
| Link-style button | Text-only, no button chrome, used inline | P1 |
| Destructive button | Visually distinct variant for delete/irreversible actions | P0 |

## 7. Content & communication

| Component | What it is | Priority |
|---|---|:---:|
| Help / contact bubble | Floating launcher for support chat or a help panel | P1 |
| Notification bell / center | Icon + panel listing system/account notifications | P1 |
| Onboarding walkthrough | Sequential tooltip/spotlight tour for first-time users | P2 |
| Changelog / what's-new panel | Surfaces recent updates without leaving the app | P2 |
| Feedback widget | Lightweight "send feedback" capture, distinct from support chat | P2 |

## 8. Settings & account

| Component | What it is | Priority |
|---|---|:---:|
| Settings page shell | Consistent layout for grouped settings sections | P1 |
| Profile / account menu | Avatar-triggered dropdown: profile, settings, sign out | P0 |
| Theme switcher | Light/dark (or brand-theme) toggle | P1 |
| Language switcher | Locale selector, relevant given BillGen's FR/NL bilingual need | P1 |
| Org/workspace switcher | Same pattern as BillGen's company switcher, generalized | P1 |

## 9. Utility

| Component | What it is | Priority |
|---|---|:---:|
| Keyboard-shortcut hint (`kbd`) | Small styled key-combo label | P1 |
| Copy-to-clipboard button | Icon button with copy + confirmation feedback | P1 |
| Drag handle | Grip affordance for reorderable lists | P2 |
| Resizer | Draggable edge for resizable panels/columns | P2 |

---

**Suggested build order.** All P0 items form the actual MVP of a personal
design system — roughly 30 components. That's the set worth getting right in
the component-builder tool (see `COMPONENT_BUILDER_APP_BLUEPRINT.md`) before
touching P1/P2. Everything in this list is deliberately generic — nothing
here is BillGen's invoice line editor, VAT picker, or Peppol status stepper;
those are real components too, but they're compositions *of* this base set,
not part of it.
