# SUPERSEDED (2026-08-25)

This directory is the **auto-trace** of the BillGen mark that used to feed
`LogoMark.tsx` — the wobbly strokes, misshapen B-bowl and crude fold triangle
came from here (`paths.json` → `billgen_icon.svg` → the component).

It has been replaced by hand-authored geometry:

- **Vector source of truth:** `assets/brand/billgen-mark.svg`
- **Web copy of the same paths:** `henrioutai-ui/src/components/LogoMark.tsx`
- **Every raster:** `python scripts/generate_brand_assets.py`

Do **not** re-trace from the files here — a cleaner trace of the same PNG just
produces a smoother version of the same wrong shape.

The one file still worth keeping is **`billgen_icon_transparent_master.png`**
(350x453): the clean, correctly-cropped mark from the original logo board, and
the reference the current geometry was measured against. Note that it is also
the highest-resolution raster of the mark that exists — in the 1254x1254
original (`docs/BillGen_logo.png`) the mark itself occupies only 308x415 px,
so there is nothing sharper to crop. Anything needing more resolution must come
from the vector.
