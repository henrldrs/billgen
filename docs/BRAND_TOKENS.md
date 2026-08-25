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

Single source of truth: [`frontend-react/src/styles/`](../frontend-react/src/styles/)
(the `@billgen/ui` package).

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
