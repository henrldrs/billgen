import type { ReactNode } from "react";

export interface IconChipProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "navy" | "neutral";
  shape?: "chip" | "circle";
  active?: boolean;
  className?: string;
}

/** Faux-3D "raised chip" wrapper: gradient fill + inset highlight + drop shadow. */
export function IconChip({
  children,
  size = "md",
  tone = "neutral",
  shape = "chip",
  active = false,
  className,
}: IconChipProps) {
  const classes = [
    "bg-icon-chip",
    `bg-icon-chip--${size}`,
    `bg-icon-chip--${tone}`,
    shape === "circle" ? "bg-icon-chip--circle" : "",
    active ? "bg-icon-chip--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      <span className="bg-icon-chip__icon">{children}</span>
    </span>
  );
}
