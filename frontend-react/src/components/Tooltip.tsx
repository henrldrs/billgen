import { useId } from "react";
import type { ReactNode } from "react";

export interface TooltipProps {
  /** Tooltip content — keep it to a short clarifying phrase. */
  label: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** The element being explained — shown on hover and keyboard focus. */
  children: ReactNode;
  className?: string;
}

/**
 * CSS-only tooltip: dark glass pill that fades in on hover/focus-within.
 * Wraps its child inline; no portal, no positioning library — fine for the
 * short labels it's meant for. Linked via aria-describedby.
 */
export function Tooltip({ label, side = "top", children, className }: TooltipProps) {
  const id = useId();
  const classes = ["bg-tooltip-wrap", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className={`bg-tooltip bg-tooltip--${side}`}>
        {label}
      </span>
    </span>
  );
}
