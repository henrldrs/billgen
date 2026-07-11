import type { CSSProperties } from "react";

export interface SkeletonProps {
  /**
   * text — one or more shimmering lines (see `lines`);
   * block — a rectangle (thumbnails, charts, table cells);
   * circle — avatar/icon placeholder.
   */
  variant?: "text" | "block" | "circle";
  width?: string | number;
  height?: string | number;
  /** Only for variant="text": number of lines; the last one runs short. */
  lines?: number;
  className?: string;
}

/**
 * Loading placeholder with a soft shimmer sweep. Decorative only —
 * aria-hidden; announce loading state on the surrounding region instead.
 */
export function Skeleton({ variant = "text", width, height, lines = 1, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width != null) style.width = width;
  if (height != null) style.height = height;

  if (variant === "text" && lines > 1) {
    const classes = ["bg-skeleton-lines", className].filter(Boolean).join(" ");
    return (
      <span className={classes} style={style} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={[
              "bg-skeleton",
              "bg-skeleton--text",
              i === lines - 1 ? "bg-skeleton--short" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </span>
    );
  }

  const classes = ["bg-skeleton", `bg-skeleton--${variant}`, className].filter(Boolean).join(" ");
  return <span className={classes} style={style} aria-hidden="true" />;
}
