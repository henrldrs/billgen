import type { ReactNode } from "react";

export interface SuccessStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Primary follow-up ("View invoice", "Send another"). */
  action?: ReactNode;
  className?: string;
}

/**
 * Explicit positive outcome — the moment an invoice is issued or a payment
 * lands. Bigger than a toast on purpose: the check draws itself in once
 * (stroke animation, reduced-motion safe). Same .bg-state family as
 * EmptyState/ErrorState.
 */
export function SuccessState({ title, description, action, className }: SuccessStateProps) {
  const classes = ["bg-state", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <span className="bg-state__mark bg-state__mark--success" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle className="bg-state__success-ring" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path className="bg-state__success-check" d="M7 12.5 10.5 16 17 8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h3 className="bg-state__title">{title}</h3>
      {description ? <p className="bg-state__desc">{description}</p> : null}
      {action ? <div className="bg-state__action">{action}</div> : null}
    </div>
  );
}
