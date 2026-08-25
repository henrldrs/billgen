import type { SVGProps } from "react";

export interface LogoMarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "width" | "height"> {
  /** Height in px; width is derived from the mark's native aspect ratio. */
  size?: number;
}

const ASPECT = 350 / 453;

/**
 * The BillGen mark — an invoice page whose right edge forms a B, with a folded
 * top-right corner and a euro sign in the body.
 *
 * Geometry is hand-authored, not traced: page corners are r=26 on the stroke
 * centreline, the lower bowl is a circle (centre 213,330 r=103) and the euro
 * ring is a circle (centre 129,334 r=38). It shares the 350x453 viewBox with
 * the mark it replaced, so sizing at every call site is unchanged.
 *
 * Source of truth for non-web surfaces (PDF footer, app icons, favicons):
 * assets/brand/billgen-mark.svg, rendered by scripts/generate_brand_assets.py.
 * Keep the two in step — edit the geometry in one and port it to the other.
 *
 * Fills use the semantic tokens rather than the raw brand hex, so the mark
 * retints correctly if another app remaps the token layer.
 */
export function LogoMark({ size = 28, ...rest }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 350 453"
      xmlns="http://www.w3.org/2000/svg"
      width={Math.round(size * ASPECT)}
      height={size}
      {...rest}
    >
      <g
        fill="none"
        stroke="var(--bg-navy)"
        strokeWidth={25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* page: top edge, left edge, bottom edge, then up around the lower
            bowl of the B and left along its waist */}
        <path d="M 178 32 L 59 32 A 26 26 0 0 0 33 58 L 33 395 A 26 26 0 0 0 59 421 L 261 421 A 103 103 0 0 0 261 239 L 173 239" />
        {/* upper bowl: down from the fold, hooking left into the waist */}
        <path d="M 274 138 C 279 153 279 183 273 201 C 267 219 254 239 240 239" />
      </g>

      {/* the two ruled lines of the invoice */}
      <g fill="var(--bg-navy)">
        <rect x={78} y={142} width={87} height={18} rx={9} />
        <rect x={78} y={188} width={87} height={18} rx={9} />
      </g>

      {/* folded corner, over the page so the top edge reads as cut */}
      <path fill="var(--bg-accent)" d="M 188 20 L 278 131 L 188 131 Z" />

      {/* euro sign */}
      <g fill="none" stroke="var(--bg-accent)" strokeLinecap="round">
        <path strokeWidth={12} d="M 140 298 A 38 38 0 1 0 140 370" />
        <path strokeWidth={9} d="M 82 326 L 126 326" />
        <path strokeWidth={9} d="M 82 342 L 122 342" />
      </g>
    </svg>
  );
}
