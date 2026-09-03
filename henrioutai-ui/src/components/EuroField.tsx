/** The € motif, scattered — ported from billgen.be 2026-09-03.
 *
 *  It comes out of the mark itself: there is a euro inside the document in the
 *  BillGen logo, so repeating it at architectural scale is the brand's own
 *  shape rather than ornament borrowed from a template. The soft circles it
 *  replaced on the site could have sat on any page.
 *
 *  Deliberately irregular. Sizes, rotations, ring counts and arc sweeps all
 *  differ, several glyphs are cropped by the container, and some are fragments
 *  with no crossbars at all. Nothing shares a horizontal, because the moment
 *  two of them line up the field reads as a pattern instead of as texture.
 *
 *  Decorative and inert: `aria-hidden`, no pointer events, no state.
 */

export interface EuroFieldProps {
  /** Which ground the glyphs are drawn on.
   *
   *  `ink` is for light surfaces, where they read as faint green line work
   *  multiplied into the page. `light` is for the deep field, where a green
   *  stroke disappears and a pale one screened over the ground does the work.
   *  There is no single tone that survives both. */
  tone?: "ink" | "light";
  className?: string;
}

/** Geometry of one glyph. Fixed, never random at runtime.
 *
 *  A `Math.random()` here would differ between a server render and the
 *  client's, which is a hydration mismatch on every load. The randomness is
 *  real, it just happened once — at design time — and was written down. */
interface Glyph {
  top: string;
  left: string;
  size: string;
  rotate: number;
  /** Concentric arcs. Several reads as ribbed; one reads as a sketch. */
  rings: number;
  /** The euro's crossbars. Dropping them leaves a bare arc, which is the
   *  point — a field of identical complete glyphs is wallpaper. */
  bars: 0 | 1 | 2;
  /** Degrees of arc. Short sweeps are fragments rather than letters. */
  sweep: number;
  opacity: number;
}

const GLYPHS: Glyph[] = [
  { top: "-8%", left: "-14%", size: "34vw", rotate: -14, rings: 3, bars: 2, sweep: 280, opacity: 1 },
  { top: "4%", left: "72%", size: "46vw", rotate: 22, rings: 4, bars: 0, sweep: 300, opacity: 0.8 },
  { top: "21%", left: "31%", size: "13vw", rotate: -37, rings: 1, bars: 2, sweep: 265, opacity: 0.7 },
  { top: "33%", left: "-9%", size: "22vw", rotate: 51, rings: 2, bars: 1, sweep: 150, opacity: 0.85 },
  { top: "40%", left: "84%", size: "27vw", rotate: -8, rings: 2, bars: 2, sweep: 275, opacity: 0.75 },
  { top: "54%", left: "18%", size: "38vw", rotate: 9, rings: 3, bars: 0, sweep: 110, opacity: 0.7 },
  { top: "63%", left: "58%", size: "16vw", rotate: -62, rings: 1, bars: 1, sweep: 290, opacity: 0.9 },
  { top: "74%", left: "-12%", size: "29vw", rotate: 31, rings: 4, bars: 2, sweep: 285, opacity: 0.65 },
  { top: "82%", left: "67%", size: "20vw", rotate: -25, rings: 2, bars: 0, sweep: 200, opacity: 0.8 },
  { top: "91%", left: "26%", size: "24vw", rotate: 14, rings: 1, bars: 2, sweep: 270, opacity: 0.7 },
];

const CX = 52;
const CY = 50;

/** One arc of the euro's bowl, open to the right. */
function arc(r: number, sweep: number): string {
  const gap = (360 - sweep) / 2;
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = CX + r * Math.cos(rad(gap));
  const y1 = CY + r * Math.sin(rad(gap));
  const x2 = CX + r * Math.cos(rad(360 - gap));
  const y2 = CY + r * Math.sin(rad(360 - gap));
  const large = sweep > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function EuroGlyph({ rings, bars, sweep }: Pick<Glyph, "rings" | "bars" | "sweep">) {
  const outer = 38;
  const step = 6.5;
  const radii = Array.from({ length: rings }, (_, i) => outer - i * step);
  const barLeft = CX - outer - 5;

  return (
    // SVG rather than CSS circles, which is what lets the strokes carry
    // `vector-effect="non-scaling-stroke"`: the line stays hairline-thin at any
    // glyph size instead of thickening with it. A 46vw glyph with a scaled
    // stroke reads as a drawn ring; with a hairline it reads as architecture.
    <svg viewBox="0 0 100 100" fill="none" className="bg-euro-glyph">
      {radii.map((r) => (
        <path
          key={r}
          d={arc(r, sweep)}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {bars >= 1 && (
        <path
          d={`M ${barLeft} 41 H ${CX + outer * 0.42}`}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {bars >= 2 && (
        <path
          d={`M ${barLeft} 59 H ${CX + outer * 0.26}`}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export function EuroField({ tone = "ink", className }: EuroFieldProps) {
  const classes = ["bg-euro-field", `bg-euro-field--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div aria-hidden className={classes}>
      {GLYPHS.map((glyph, index) => (
        <span
          key={index}
          className="bg-euro-field__glyph"
          style={{
            top: glyph.top,
            left: glyph.left,
            width: glyph.size,
            height: glyph.size,
            opacity: glyph.opacity,
            transform: `rotate(${glyph.rotate}deg)`,
          }}
        >
          <EuroGlyph rings={glyph.rings} bars={glyph.bars} sweep={glyph.sweep} />
        </span>
      ))}
    </div>
  );
}
