import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

export interface ChartLegendItem {
  key: string;
  label: ReactNode;
  /** Swatch color — pass a token reference: "var(--bg-accent)". */
  color: string;
}

export interface ChartWrapperProps {
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ChartLegendItem[];
  /** Right-aligned controls (range Segmented, export Menu…). */
  actions?: ReactNode;
  /** The chart itself — any lib, or hand-drawn SVG. */
  children: ReactNode;
  /** Small print under the chart (source, period). */
  caption?: ReactNode;
  /** Skeleton block instead of the chart while data loads. */
  loading?: boolean;
  /** Rendered instead of the chart when there's no data. */
  empty?: ReactNode;
  /** Plot area height (default 220px). */
  height?: string | number;
  className?: string;
}

/**
 * Consistent frame around any chart: title row, legend, actions, caption —
 * so whichever chart lib the dashboard ends up using, every chart reads the
 * same. Data surface: near-opaque sheen, no glass (same rule as KpiCard).
 */
export function ChartWrapper({
  title,
  subtitle,
  legend = [],
  actions,
  children,
  caption,
  loading,
  empty,
  height = 220,
  className,
}: ChartWrapperProps) {
  const classes = ["bg-chart", className].filter(Boolean).join(" ");
  return (
    <figure className={classes}>
      <div className="bg-chart__header">
        <div className="bg-chart__titles">
          <figcaption className="bg-chart__title">{title}</figcaption>
          {subtitle ? <div className="bg-chart__subtitle">{subtitle}</div> : null}
        </div>
        {actions ? <div className="bg-chart__actions">{actions}</div> : null}
      </div>
      {legend.length > 0 ? (
        <div className="bg-chart__legend">
          {legend.map((item) => (
            <span key={item.key} className="bg-chart__legend-item">
              <span className="bg-chart__swatch" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="bg-chart__plot" style={{ height }}>
        {loading ? (
          <Skeleton variant="block" height="100%" />
        ) : empty != null ? (
          <div className="bg-chart__empty">{empty}</div>
        ) : (
          children
        )}
      </div>
      {caption ? <div className="bg-chart__caption">{caption}</div> : null}
    </figure>
  );
}
