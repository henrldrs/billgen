# Component Builder — Local App Blueprint

**What you asked for.** A local desktop tool, "like Paint," where you
manually design UI components — and it outputs real code you can drop into
BillGen or any future project. Yes, this is buildable. One honest caveat up
front: "like Paint" as a *metaphor* (direct manipulation, immediate visual
feedback, no code required to use it) is the right target. "Like Paint" as a
*literal mechanism* (freehand pixels on a raster canvas) is the wrong one —
pixels can't become a React button. The right analogue is closer to a small,
personal Figma-to-code tool: you manipulate real DOM elements on a canvas,
an inspector panel edits their properties, and a generator serializes the
result to `.tsx` + CSS. This document is the blueprint only — no code yet,
per your standing instruction to confirm before production.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | **Tauri** (Rust) | Matches BillGen's existing desktop pattern (`frontend-electron/src-tauri`) — same skills, same packaging pipeline, small binary, no Electron overhead |
| UI | **React + Vite** | Same as every other BillGen front end; the tool can literally dogfood the components it generates |
| Canvas | DOM-based editing surface (absolute-position or CSS-grid overlay with drag/resize handles) | Not `<canvas>` — the elements being edited must remain real, styleable DOM nodes so their final state *is* the exportable markup |
| Styling model | Tailwind utility classes + CSS custom properties for tokens | Matches the pattern already in your reference theme (`theme.css` custom properties → Tailwind `@theme inline`) — the tool should write into that exact convention, not invent a new one |
| Persistence | Local JSON files on disk, one per component + a project manifest | Local-first, git-friendly, portable across machines — no database needed for a personal tool |
| Code generation | A serializer module: component JSON → `.tsx` (+ optional `.stories.tsx`) | Deterministic, re-runnable — regenerating from the same JSON always produces the same code |

---

## 2. Data model (the single source of truth)

Every component is one JSON file. The canvas renders *from* this file; the
inspector panel *edits* this file; the code generator *reads* this file. No
divergence between what you see and what gets exported, by construction.

```json
{
  "id": "primary-cta",
  "name": "PrimaryButton",
  "baseType": "button",
  "layout": { "paddingX": "1.5rem", "paddingY": "0.75rem", "gap": "0.5rem" },
  "shape": { "radius": "full", "border": "none" },
  "tokens": { "fill": "color.brand.green", "text": "color.neutral.0" },
  "typography": { "size": "md", "weight": "medium" },
  "states": {
    "default": {},
    "hover": { "fill": "color.brand.green.90" },
    "active": { "fill": "color.brand.green.80" },
    "disabled": { "opacity": 0.5, "pointerEvents": "none" },
    "loading": { "content": "spinner", "pointerEvents": "none" }
  },
  "variants": ["filled", "outline", "ghost"]
}
```

Tokens are always references (`color.brand.green`), never raw hex — the
token manager (§3) owns the actual values, so a palette change propagates to
every component that references it instead of requiring a find-and-replace.

---

## 3. App screens

1. **Canvas / workspace** — the live, editable render of the component being worked on. Click to select an element, drag to resize, everything reflects instantly.
2. **Layers panel** — tree view for composite components (e.g. a KPI card = container + icon chip + label + value + trend row).
3. **Inspector panel** — the property editor for whatever's selected on canvas: size preset, variant, radius, token-bound color swatches, spacing, typography, and a **state switcher tab** (default/hover/active/disabled/loading) so you design every state explicitly instead of guessing hover from a CSS rule you never previewed.
4. **Token & theme manager** — a dedicated screen for the palette (your navy `#142436` / green `#529A85` scales), spacing scale, radius scale, type scale. Edited once, referenced everywhere.
5. **Component library sidebar** — starter shells seeded from the Universal Component Checklist (P0 items first: button, input, card, badge, modal...), so you're placing/adjusting a known shape, not starting from a blank canvas every time.
6. **Export / sync panel** — preview the generated `.tsx`, copy it, or (once you point the tool at a real project path) write it directly into e.g. `frontend-react/src/components/ui/PrimaryButton.tsx` and update the shared `design-tokens.css`.
7. **Project browser** — since you want this reusable *across* apps, not just BillGen: multiple named projects, each with its own token set, sharing the same tool and base component shells.

---

## 4. Phased build plan

Building the whole thing in one pass isn't realistic — scoping it in phases
keeps each stage independently useful.

**Phase 1 — MVP (single component, real output).**
Canvas renders one component at a time. Inspector controls: size, variant,
radius, token-bound color, the 4-5 core states. Export button generates one
real `.tsx` file + appends to a `design-tokens.css`. Save/load a single
project JSON to disk. *Goal: prove the round-trip — design on canvas, get a
real file, drop it into BillGen, it works.*

**Phase 2 — Library, not just one component.**
Layers panel for composite components. Component library sidebar seeded with
the P0 checklist as starter shells. Token & theme manager becomes its own
screen instead of inline controls. Multiple components per project.

**Phase 3 — Direct project sync.**
Point the export panel at a real repo path; write files directly instead of
copy-paste. A live preview grid showing every component in the library at
once (a personal, generated Storybook). Composite/nested components (a card
containing a button containing an icon).

**Phase 4 — stretch.**
Reverse-import: paste in existing `.tsx`, the tool parses it back into the
visual JSON so existing BillGen components become editable, not just
new ones. Multi-theme support (per-project token sets) so the same tool
genuinely serves "every app you build," each with its own brand tokens
riding on the same component shapes.

---

## 5. What I'd need from you before Phase 1 starts

- Confirmation to move from blueprint to actual build (per your standing rule — nothing below this line has been started).
- A target output convention: Tailwind classes (matches your existing repos) vs. CSS Modules vs. styled-components — Tailwind is the default assumption above since it's what BillGen already uses.
- Where Phase 1's single test export should land — a scratch folder, or directly into a connected project.

Nothing has been built yet. Say the word and I'll scope Phase 1 as an actual implementation plan (file structure, first components, first Tauri window) rather than a proposal.
