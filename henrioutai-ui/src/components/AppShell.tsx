import type { ReactNode } from "react";

import { EuroField } from "./EuroField";
import { GlassFilters } from "./GlassFilters";

export interface AppShellProps {
  /** Global chrome — typically <TopNav …>. Sticky at the top while content scrolls. */
  nav?: ReactNode;
  /** Content column: default 1100px, wide 1400px, full = no max-width. */
  width?: "default" | "wide" | "full";
  /**
   * The € motif behind everything, and the SVG filters frosted surfaces need.
   *
   * On by default: the backdrop is a gradient whose whole job is to give glass
   * something to be glass over, and a gradient with nothing in it does that
   * only weakly. The motif is the same one the marketing page uses, at about a
   * third of its strength — that field sits behind a headline, this one sits
   * behind a table somebody is reading.
   *
   * Pass `false` for a screen that is itself the texture (a full-bleed PDF
   * preview, a canvas) or for a print stylesheet.
   */
  texture?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * The outer frame every screen renders inside: brand-tinted gradient backdrop
 * (what makes the glass surfaces read as 3D), sticky nav slot, centered
 * content column, and the € field behind all of it. Mount once around the
 * router outlet.
 *
 * `GlassFilters` is mounted here rather than by each frosted surface because
 * its filter ids must exist exactly once in the document; a second copy would
 * duplicate them, and `url(#id)` resolves to whichever the browser saw first.
 */
export function AppShell({
  nav,
  width = "default",
  texture = true,
  children,
  className,
}: AppShellProps) {
  const classes = ["bg-app-shell", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {texture ? (
        <>
          <GlassFilters />
          {/* `auto`, because this is the one place that cannot know its ground
              until runtime: the backdrop is paper or the sapphire field
              depending on the theme, and the motif has to follow. */}
          <EuroField tone="auto" className="bg-app-shell__texture" />
        </>
      ) : null}
      {nav ? <div className="bg-app-shell__nav">{nav}</div> : null}
      <main className={`bg-app-shell__content bg-app-shell__content--${width}`}>
        {children}
      </main>
    </div>
  );
}
