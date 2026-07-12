import type { ReactNode } from "react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Renders a "Try again" button wired to this. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** What renders when a request fails — distinct from EmptyState. */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  const classes = ["bg-state", "bg-state--error", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="alert">
      <div className="bg-state__mark" aria-hidden="true">
        !
      </div>
      <h3 className="bg-state__title">{title}</h3>
      {description != null ? <p className="bg-state__desc">{description}</p> : null}
      {onRetry ? (
        <div className="bg-state__action">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
