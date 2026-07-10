import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Usually an IconChip; omitted = text only. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Call-to-action button(s). */
  action?: ReactNode;
  className?: string;
}

/** What renders when a list/section has nothing in it yet. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const classes = ["bg-state", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {icon != null ? <div className="bg-state__icon">{icon}</div> : null}
      <h3 className="bg-state__title">{title}</h3>
      {description != null ? <p className="bg-state__desc">{description}</p> : null}
      {action != null ? <div className="bg-state__action">{action}</div> : null}
    </div>
  );
}
