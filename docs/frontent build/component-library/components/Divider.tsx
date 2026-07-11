import type { ReactNode } from "react";

export interface DividerProps {
  /** Optional label sitting on the line. */
  label?: ReactNode;
  /** Label placement (default start). */
  align?: "start" | "center";
  className?: string;
}

/** Section divider — hairline, optionally labeled ("March 2026", "Archived"). */
export function Divider({ label, align = "start", className }: DividerProps) {
  const classes = [
    "bg-divider",
    label ? `bg-divider--labeled bg-divider--${align}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (!label) return <hr className={classes} />;
  return (
    <div role="separator" className={classes}>
      <span className="bg-divider__label">{label}</span>
    </div>
  );
}
