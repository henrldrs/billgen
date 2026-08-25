"""Renders every raster brand asset from the one vector source.

    python scripts/generate_brand_assets.py

Source of truth: assets/brand/billgen-mark.svg. Nothing here is hand-drawn --
if the mark changes, edit that file (and henrioutai-ui's LogoMark.tsx, which
carries the same geometry for the web) and re-run this.

Outputs:
  core/pdf/assets/billgen_logo.png        free-tier PDF footer (mark only)
  frontend-electron/src-tauri/icons/*     desktop app + Windows Store icons
  frontend-{saas,electron}/public/*       favicons

Needs Playwright's Chromium (already a PDF-engine dependency) and Pillow.
"""

from __future__ import annotations

import struct
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "brand" / "billgen-mark.svg"

# On paper and in-app the mark keeps the canonical tokens. App icons and
# favicons sit on an ink tile, where the navy would disappear -- there the page
# outline goes white and the accent brightens a step (emerald-400) to hold its
# own against the dark ground.
NAVY, ACCENT = "#334155", "#10B981"
TILE_BG, TILE_NAVY, TILE_ACCENT = "#1F2937", "#FFFFFF", "#34D399"

# Fraction of the tile the mark's height occupies, and the corner radius as a
# fraction of the tile edge -- enough rounding to read as an app icon, not so
# much that it turns into a circle at 16px.
MARK_RATIO, RADIUS_RATIO = 0.66, 0.223

ASPECT = 350 / 453


def _recolor(svg: str, navy: str, accent: str) -> str:
    for attr in ("stroke", "fill"):
        svg = svg.replace(attr + '="' + NAVY + '"', attr + '="' + navy + '"')
        svg = svg.replace(attr + '="' + ACCENT + '"', attr + '="' + accent + '"')
    return svg


def _sized(svg: str, height: int) -> str:
    width = round(height * ASPECT)
    return svg.replace(
        'width="350" height="453"',
        'width="{}" height="{}"'.format(width, height),
    )


class Renderer:
    """Chromium is the renderer so the rasters match what the browser draws
    from the same paths -- no second SVG implementation to disagree with."""

    def __init__(self, page, svg: str):
        self.page, self.svg = page, svg

    def _shot(self, html: str, selector: str) -> Image.Image:
        self.page.set_content('<html><body style="margin:0">' + html + "</body></html>")
        raw = self.page.locator(selector).screenshot(omit_background=True)
        return Image.open(BytesIO(raw)).convert("RGBA")

    def mark(self, height: int) -> Image.Image:
        """The bare mark on transparency, at its native 350:453 aspect."""
        svg = _sized(_recolor(self.svg, NAVY, ACCENT), height)
        return self._shot('<div id="m" style="display:inline-flex">' + svg + "</div>", "#m")

    def tile(self, size: int) -> Image.Image:
        """The mark centred on the rounded ink tile, square, transparent corners."""
        svg = _sized(_recolor(self.svg, TILE_NAVY, TILE_ACCENT), round(size * MARK_RATIO))
        html = (
            '<div id="t" style="width:{s}px;height:{s}px;border-radius:{r:.2f}px;'
            "background:{bg};display:flex;align-items:center;justify-content:center\">{svg}</div>"
        ).format(s=size, r=size * RADIUS_RATIO, bg=TILE_BG, svg=svg)
        # Chromium rounds the element box, so re-assert the exact pixel size.
        return self._shot(html, "#t").resize((size, size), Image.LANCZOS)


def _favicon_svg(mark: str) -> str:
    """The tile as a single scalable file -- what modern browsers prefer."""
    inner = mark.split(">", 1)[1].rsplit("</svg>", 1)[0]
    # The mark is taller than it is wide, so the tile squares off around its
    # height and the mark is centred horizontally within that square.
    side = 453
    offset_x = (side - 350) / 2 + (350 - 350 * MARK_RATIO) / 2
    offset_y = (453 - 453 * MARK_RATIO) / 2
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}"'
        ' width="{side}" height="{side}">\n'
        '  <rect width="{side}" height="{side}" rx="{r:.1f}" fill="{bg}"/>\n'
        "  <g transform=\"translate({ox:.2f} {oy:.2f}) scale({scale})\">{inner}</g>\n"
        "</svg>\n"
    ).format(
        side=side, r=side * RADIUS_RATIO, bg=TILE_BG,
        ox=offset_x, oy=offset_y, scale=MARK_RATIO, inner=inner,
    )


def write_icns(path: Path, tile) -> None:
    """Minimal PNG-based .icns container -- Pillow's ICNS writer is macOS-only,
    and Tauri only needs the file to be well-formed for a macOS bundle."""
    types = {
        "icp4": 16, "icp5": 32, "ic11": 32, "ic12": 64, "ic07": 128,
        "ic13": 256, "ic08": 256, "ic14": 512, "ic09": 512, "ic10": 1024,
    }
    chunks = b""
    for kind, size in types.items():
        buf = BytesIO()
        tile(size).save(buf, format="PNG")
        data = buf.getvalue()
        chunks += kind.encode("ascii") + struct.pack(">I", len(data) + 8) + data
    path.write_bytes(b"icns" + struct.pack(">I", len(chunks) + 8) + chunks)


def main() -> None:
    svg = SOURCE.read_text(encoding="utf-8")
    icons = ROOT / "frontend-electron" / "src-tauri" / "icons"
    written: list[Path] = []

    with sync_playwright() as play:
        browser = play.chromium.launch()
        # device_scale_factor=1 keeps element screenshots at exactly the CSS
        # pixel size we asked for.
        page = browser.new_page(viewport={"width": 1200, "height": 1200}, device_scale_factor=1)
        render = Renderer(page, svg)

        # --- PDF footer -------------------------------------------------
        # Rendered far larger than the ~16px it displays at, so the mark stays
        # sharp when the PDF is printed or zoomed.
        pdf_logo = ROOT / "core" / "pdf" / "assets" / "billgen_logo.png"
        render.mark(256).save(pdf_logo, format="PNG", optimize=True)
        written.append(pdf_logo)

        # --- desktop icons ----------------------------------------------
        cache: dict[int, Image.Image] = {}

        def tile(size: int) -> Image.Image:
            if size not in cache:
                cache[size] = render.tile(size)
            return cache[size]

        plain = {
            "32x32.png": 32, "64x64.png": 64, "128x128.png": 128,
            "128x128@2x.png": 256, "icon.png": 512, "StoreLogo.png": 50,
        }
        for name, size in plain.items():
            tile(size).save(icons / name, format="PNG", optimize=True)
            written.append(icons / name)
        for size in (30, 44, 71, 89, 107, 142, 150, 284, 310):
            name = "Square{s}x{s}Logo.png".format(s=size)
            tile(size).save(icons / name, format="PNG", optimize=True)
            written.append(icons / name)

        ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        tile(256).save(icons / "icon.ico", format="ICO", sizes=ico_sizes)
        written.append(icons / "icon.ico")
        write_icns(icons / "icon.icns", tile)
        written.append(icons / "icon.icns")

        # Keep the generator's own input beside the icons it produced, so a
        # future `tauri icon` run starts from the real mark and not a stand-in.
        source_png = icons.parent / "icon-source.png"
        tile(1024).save(source_png, format="PNG", optimize=True)
        written.append(source_png)

        # --- favicons ----------------------------------------------------
        favicon = _favicon_svg(_recolor(svg, TILE_NAVY, TILE_ACCENT))
        for app in ("frontend-saas", "frontend-electron"):
            public = ROOT / app / "public"
            public.mkdir(parents=True, exist_ok=True)
            tile(256).save(public / "favicon.ico", format="ICO",
                           sizes=[(16, 16), (32, 32), (48, 48)])
            tile(180).save(public / "apple-touch-icon.png", format="PNG", optimize=True)
            (public / "favicon.svg").write_text(favicon, encoding="utf-8")
            written += [
                public / "favicon.ico",
                public / "apple-touch-icon.png",
                public / "favicon.svg",
            ]

        browser.close()

    for path in written:
        print("  {}  ({:,} bytes)".format(path.relative_to(ROOT).as_posix(), path.stat().st_size))
    print("\n{} assets written from {}".format(len(written), SOURCE.relative_to(ROOT).as_posix()))


if __name__ == "__main__":
    main()
