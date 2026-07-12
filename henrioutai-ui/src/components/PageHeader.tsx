import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import { BackIcon } from "./icons/BackIcon";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Primary page action(s), right-aligned (usually one Button). */
  actions?: ReactNode;
  /** When set, renders a back button before the title. */
  onBack?: () => void;
  className?: string;
}

/**
 * Consistent title row at the top of a page's content region: optional back
 * button, title + subtitle, primary action. Sits below TopNav, above Cards.
 */
export function PageHeader({ title, subtitle, actions, onBack, className }: PageHeaderProps) {
  const classes = ["bg-page-header", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {onBack ? (
        <IconButton aria-label="Back" onClick={onBack}>
          <BackIcon />
        </IconButton>
      ) : null}
      <div className="bg-page-header__titles">
        <h1 className="bg-page-header__title">{title}</h1>
        {subtitle != null ? <p className="bg-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions != null ? <div className="bg-page-header__actions">{actions}</div> : null}
    </div>
  );
}
