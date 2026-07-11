import type { ReactNode } from "react";

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
  children,
  className,
}: CardProps) {
  const classes = ["bg-card", className].filter(Boolean).join(" ");
  const hasHeader = title != null || actions != null;
  return (
    <div className={classes}>
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
