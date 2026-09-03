import type { ReactNode } from "react";

import { frostedSurface, frostedSurfaceSoft } from "./GlassFilters";

export interface CardProps {
  /** Optional header title. Header row only renders when title or actions exist. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Rendered right-aligned in the header row (buttons, badges, menus). */
  actions?: ReactNode;
  /** Rendered below the body, separated by a divider. */
  footer?: ReactNode;
  /** Set false when the body manages its own padding (tables, images). */
  padded?: boolean;
  /**
   * Opt in to the hover lift. Off by default, and deliberately so: a Card is a
   * container, and a container is not a hoverable object. Tilting the whole
   * card while the pointer is on one table row makes the row's own hover
   * unreadable — the thing that moved is not the thing under the cursor.
   * Set this only when the entire card is itself one clickable target.
   */
  interactive?: boolean;
  /**
   * Opt in to the organic frost from billgen.be — an SVG turbulence and
   * displacement filter over the blur, rather than blur alone.
   *
   * Off by default. It costs a real compositing pass per surface, so a table
   * of forty frosted rows is a scroll-jank generator; and it only reads at all
   * over a ground with something in it, which is what `--bg-app-backdrop`
   * gives it. On a flat fill it is an expensive way to draw nothing.
   *
   * `"soft"` is the small-pane variant: the displacement that reads as
   * hand-blown glass across a hero pane reads as a smear across a 200px card.
   *
   * Requires <GlassFilters /> mounted once near the app root — without it the
   * url() reference resolves to nothing and the surface falls back to plain
   * blur, which is also exactly what Safari does.
   */
  frosted?: boolean | "soft";
  children: ReactNode;
  className?: string;
}

/**
 * Bordered content container — the base unit of most layouts. Distinct from
 * the app-specific .bg-panel already in components.css: Card is composable
 * (header/body/footer slots) and app-agnostic.
 */
export function Card({
  title,
  subtitle,
  actions,
  footer,
  padded = true,
  interactive = false,
  frosted = false,
  children,
  className,
}: CardProps) {
  const classes = [
    "bg-card",
    interactive ? "bg-card--interactive" : "",
    frosted ? "bg-card--frosted" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const frost = frosted === "soft" ? frostedSurfaceSoft : frosted ? frostedSurface : undefined;
  const hasHeader = title != null || actions != null;
  return (
    <div className={classes} style={frost}>
      {hasHeader ? (
        <div className="bg-card__header">
          <div className="bg-card__titles">
            {title != null ? <h2 className="bg-card__title">{title}</h2> : null}
            {subtitle != null ? <p className="bg-card__subtitle">{subtitle}</p> : null}
          </div>
          {actions != null ? <div className="bg-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={padded ? "bg-card__body" : "bg-card__body bg-card__body--flush"}>
        {children}
      </div>
      {footer != null ? <div className="bg-card__footer">{footer}</div> : null}
    </div>
  );
}
