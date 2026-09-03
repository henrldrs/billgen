/** The SVG filters the frosted surfaces reference — ported from billgen.be.
 *
 *  Render this ONCE, near the root of the app. It draws nothing: a
 *  `backdrop-filter: url(#id)` only needs the filter to exist somewhere in the
 *  document, and this is where it exists. Mounting it twice is harmless but
 *  duplicates ids, which is a real problem the day a third one appears.
 *
 *  Two variants, as in the original mock: a stronger distortion for large
 *  panes and a softer one for small ones. The difference is `scale` — 55
 *  against 35 — because the same displacement that reads as hand-blown glass
 *  across a hero pane reads as a smear across a 200px card.
 *
 *  Chromium honours the url() reference. Safari does not, and falls back to
 *  the plain blur declared beside it — which is why the panes still read on
 *  iOS: they lose the organic distortion, not the frost.
 */
export function GlassFilters() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" className="bg-glass-filters">
      <filter id="bg-glass-distortion">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.009 0.009"
          numOctaves="2"
          seed="17"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="blurredNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurredNoise"
          scale="55"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <filter id="bg-glass-distortion-soft">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.012"
          numOctaves="2"
          seed="42"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="blurredNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurredNoise"
          scale="35"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/** The frost, as inline style rather than a CSS class.
 *
 *  This is not a preference. Lightning CSS — which Tailwind v4 runs during a
 *  build — deletes `backdrop-filter: url(#id) blur() saturate()` from the
 *  compiled stylesheet, reading the SVG filter reference as unsupported by one
 *  of the build targets. The declaration never reaches a browser that does in
 *  fact support it. Inline styles skip that pass entirely.
 *
 *  If the frost ever vanishes after a refactor, this is the first thing to
 *  check: someone will have moved it into components.css because that is
 *  where it obviously belongs.
 */
export const frostedSurface = {
  backdropFilter: "url(#bg-glass-distortion) blur(6px) saturate(160%)",
  WebkitBackdropFilter: "blur(14px) saturate(160%)",
} as const;

export const frostedSurfaceSoft = {
  backdropFilter: "url(#bg-glass-distortion-soft) blur(5px) saturate(150%)",
  WebkitBackdropFilter: "blur(12px) saturate(150%)",
} as const;
