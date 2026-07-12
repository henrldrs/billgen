# @henrioutai/ui

The **henrioutai design system** — a hand-built, token-only React component
library. Every colour is a CSS custom property; light and dark themes are one
token remap (`:root[data-bg-theme="dark"]`), not a second set of components.
No third-party UI code, no business logic, no data layer — drop it into any
React app and style it by remapping the tokens.

~58 components across actions, forms, navigation, data display, overlays,
feedback and settings, plus a hand-drawn icon set. Satoshi (UI) and Geist Mono
(numerals & identifiers) ship with it.

## Install

```bash
npm install @henrioutai/ui
```

Peer deps: `react` and `react-dom` (v19).

## Use

```tsx
// One import for the tokens + component CSS + fonts, once at your app root:
import "@henrioutai/ui/styles/fonts.css";
import "@henrioutai/ui/styles/tokens.css";
import "@henrioutai/ui/styles/components.css";

import { Button, Card, TopNav } from "@henrioutai/ui";

export function App() {
  return (
    <Card>
      <Button variant="primary">Save</Button>
    </Card>
  );
}
```

Dark mode: set `data-bg-theme="dark"` on `<html>`. The `ThemeSwitcher`
component is the ready-made control.

## Layout

```
src/
  components/        every component + icons/
  styles/
    tokens.css       brand tokens (the only thing to remap when re-skinning)
    components.css   the .bg-* component classes
    fonts.css        @font-face for Satoshi + Geist Mono
    fonts/           the font files
  index.ts           the public API
```

## Notes

Consumed from source today (`main` points at `src/index.ts`) so a workspace
can use it without a build step. Publishing to npm for outside consumers wants
a bundle step (tsup/vite) emitting `dist/` + `.d.ts` — a later task; the source
layout above is already publish-shaped.

Extracted from the BillGen monorepo; the design standard behind it is
documented there.
