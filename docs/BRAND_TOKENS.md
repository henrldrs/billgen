# BillGen Brand Tokens

**Decision (2026-07-08).** BillGen's canonical palette is the Tailwind-aligned
set taken from the logo palette reference, chosen over the Canva footer's
navy `#1e3a5f` / green `#2ecc71` variant. Do not mix the two — any asset
using the Canva pair is a layout reference only and gets remapped to these
tokens when rebuilt.

## Canonical anchors

| Anchor | Hex | Role |
|---|---|---|
| Green | `#10B981` | Primary actions, active states, logo "Gen" |
| Navy / slate | `#334155` | Sidebar, emphasis, logo "Bill" |
| Line gray | `#E5E7EB` | Borders, dividers |
| White | `#FFFFFF` | Surfaces (cards, panels, inputs) |
| Ink | `#1F2937` | Primary text |

Variants come from the Tailwind **emerald** and **slate** scales (50–900),
anchored at emerald-500 and slate-700. Status colors: red-600 (danger),
emerald-700 (success), amber-700 (warn) — each with a `-soft` 50-tint for
badge/banner backgrounds.

## Where they live

Single source of truth: [`henrioutai-ui/src/styles/`](../henrioutai-ui/src/styles/)
(the `@henrioutai/ui` package). It used to live in `frontend-react/src/styles/`;
that directory was removed when the design system was extracted into its own
package, and both shells now `@import "@henrioutai/ui/styles/tokens.css"`.

- **`tokens.css`** — two layers:
  - `--brand-*` — raw scales (emerald, slate, red, amber). Palette data;
    components never reference these directly.
  - `--bg-*` — semantic tokens (`--bg-ink`, `--bg-accent`, `--bg-line`,
    `--bg-sidebar`…). The only names components may use.
- **`components.css`** — the shared `.bg-*` component classes (button, panel,
  field, table, modal, badge…), colored exclusively via semantic tokens.

Both frontends import them from the package in their `styles.css`:

```css
@import "tailwindcss";
@import "@billgen/ui/src/styles/tokens.css";
@import "@billgen/ui/src/styles/components.css";
```

`frontend-saas/src/styles.css` and `frontend-electron/src/styles.css` are
intentionally identical and app-local styles only. **Never redefine `--bg-*`
or `.bg-*` rules in an app** — change the package files instead.

## Rules

0. **`tokens.css` is the standard** (confirmed 2026-08-25, decision
   `BGEN-BRAND-01`). The Studio AI reference frontend
   (`docs/billgen---enterprise-invoicing-&-financial-saas.zip`) repointed
   `--bg-accent` at `--brand-blue-500` `#2563EB` and swapped `--bg-font-sans`
   from Satoshi to Plus Jakarta Sans. That re-skin is **rejected**: emerald
   `#10B981` and Satoshi remain canonical. The reference is a source of
   layout and component patterns only, never of palette or type.

   This is enforced, not just documented — `frontend-react/src/scaffold/tokens.test.ts`
   fails the build if `--bg-accent` stops being emerald, if the sans face
   stops being Satoshi, or if any Tailwind colour utility or raw hex appears
   in app or component source.

0b. **One icon grammar** (decided 2026-08-25, `BGEN-BRAND-03`). Every icon on
   every surface — SaaS, Windows, Mobile — obeys the same rules:

   | Axis | Rule |
   |---|---|
   | Geometry | 24x24 grid, no exceptions |
   | Stroke | 2px, one weight only. No thin/medium/bold mixing |
   | Corners | round caps **and** joins throughout |
   | Colour | `currentColor` only, `fill="none"`. Never a literal, never decorative colour |
   | Idle | `--bg-icon-idle-opacity` (.8) |
   | Hover | `--bg-icon-hover-opacity` (1) |
   | Active | full opacity + the `.icon-accent` sub-paths take the brand colour |
   | Disabled | `--bg-icon-disabled-opacity` (.4) — unavailable must still be readable |

   **One source: BillGen's own SVG set.** `lucide-react` is acceptable only as a
   *wholesale* replacement, never alongside. **Emoji are never UI** — they render
   differently per platform, ignore the colour tokens, and cannot take a hover or
   disabled state. The Studio AI reference mixes all three grammars; that is the
   "Frankenstein effect" this rule exists to prevent.

   Enforced by `frontend-react/src/scaffold/icons.test.ts`, which also fails if an
   icon library is added as a dependency. Scaffold (`.sk-*`) is exempt — it is
   deliberately off-brand.

1. **Components use semantic tokens only.** No raw hex, no `--brand-*`
   references in component CSS/TSX. If a component needs a color that has no
   semantic slot, add the slot to `tokens.css` first.
2. **The universal component library stays app-agnostic.** "BillGen" is one
   skin: retheming for another product means remapping the `--bg-*` layer,
   nothing else (see `UNIVERSAL_COMPONENT_LIBRARY_CHECKLIST.md`).
3. **Contrast:** `#10B981` on white is decorative/large-element territory
   (~2.6:1). For accent-colored *text* on white use `--bg-accent-ink`
   (emerald-700); white text on accent buttons is acceptable at button sizes,
   hover uses emerald-600.
4. **Status ≠ brand.** Paid uses the green *status* tint; "issued" uses navy
   tint so it never competes with paid/green. Draft stays neutral gray.

## Navigation slots (pre-wired for the nav build)

`--bg-sidebar`, `--bg-sidebar-ink`, `--bg-sidebar-ink-soft`,
`--bg-sidebar-active`, `--bg-sidebar-line` — defined so the sidebar/top-bar
components (next build step, from hand drawings) consume slots instead of
inventing colors. Default skin: navy sidebar, light text, green active state.


## The two greens (2026-09-03)

The pre-sale site's palette and grounds were brought into `tokens.css` at
Henri's ask. Everything that arrived is **additive** — new token names only,
no existing token changed value — so the block is reversible by deleting it.

### Why there are two greens, and which is canonical

| | Hex | What it is |
|---|---|---|
| `--bg-accent` | `#10B981` | **Canonical.** The app's action colour, pinned by the guard test in `frontend-react/src/scaffold/tokens.test.ts`. |
| `--brand-logo-green` | `#529984` | What the green in the mark actually is, sampled from the raster original rather than guessed. |

The raster the sampling was done on — `docs/BillGen_logo.png`, 852 KB — was
deleted in T-24 once `assets/brand/billgen-mark.svg` became the source of the
mark. It is recoverable with `git show b6ae363:docs/BillGen_logo.png`, which is
the only reason this number is still checkable.

Both are correct and they are different greens. The site discovered this the
hard way: a brighter emerald button beside the `#529984` wordmark in one header
reads as two greens, because it is two greens — so the site remapped its own
primary to the mark's green and left the app's anchor alone.

**Open decision, Henri's:** whether `#529984` should become the canonical
accent everywhere. That is a change to this document *and* to the guard test —
deliberately not something a stylesheet edit can do quietly. Until it is taken,
`--brand-logo-green` is available for the mark and for surfaces that sit beside
it, and `--bg-accent` remains what buttons and active states use.

### The grounds

Three new surfaces, copied stop-for-stop from the site so the two are literally
the same surface rather than two attempts at the same idea:

- **`--bg-paper`** — tinted white. The counterpart to `--bg-app-backdrop`: soft
  washes of the mark's green and a warm off-white, so a page reads as one long
  gradient rather than a light half and a dark half.
- **`--bg-deep`** — the long dark teal field, with `--bg-deep-ink`,
  `--bg-deep-ink-soft`, `--bg-deep-ink-muted` and `--bg-deep-line` for what
  sits on it. It is dark under either theme, so those do **not** flip with
  `data-bg-theme` — that is why they are their own tokens rather than a remap
  of `--bg-ink`.
- **`--bg-seam-into-deep`** (with `--bg-seam-height`, 320px) — the ramp between
  the two. Its shape encodes two mistakes worth not repeating; the reasoning is
  written next to it in `tokens.css`.

Glass over the dark field uses `--bg-deep-glass*`, not `--bg-glass-*`: white
glass at 78% over that ground reads as a white box rather than as glass.
