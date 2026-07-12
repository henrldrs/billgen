import type { ReactNode } from "react";

export interface KpiDelta {
  /** Preformatted change, e.g. "+12,4 %" or "−3". Rendered in mono. */
  value: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is good news (revenue: yes, overdue count: no). */
  positiveIsGood?: boolean;
}

export interface KpiCardProps {
  label: ReactNode;
  /** The metric — wrap amounts yourself if they need currency formatting;
   * mono tabular figures are applied automatically. */
  value: ReactNode;
  delta?: KpiDelta;
  /** Small print under the value ("vs. last month"). */
  hint?: ReactNode;
  /** Optional leading visual — typically an IconChip. */
  icon?: ReactNode;
  className?: string;
}

function TrendArrow({ direction }: { direction: KpiDelta["direction"] }) {
  const d =
    direction === "up" ? "M2 8.5 6 4l4 4.5" : direction === "down" ? "M2 3.5 6 8l4-4.5" : "M2 6h8";
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Single metric + trend — the dashboard building block. Upgrades the flat
 * .bg-kpi-card already in the base styles (same class, premium overrides).
 * Data surface: near-opaque, no glass.
 */
export function KpiCard({ label, value, delta, hint, icon, className }: KpiCardProps) {
  const classes = ["bg-kpi-card", className].filter(Boolean).join(" ");
  const good = delta ? (delta.direction === "up") === (delta.positiveIsGood ?? true) : false;
  const deltaTone =
    delta?.direction === "flat" ? "flat" : good ? "good" : "bad";
  return (
    <div className={classes}>
      {icon ? <div className="bg-kpi-card__icon">{icon}</div> : null}
      <div className="bg-kpi-card__body">
        <div className="bg-kpi-card__label">{label}</div>
        <div className="bg-kpi-card__row">
          <div className="bg-kpi-card__value">{value}</div>
          {delta ? (
            <span className={`bg-kpi-card__delta bg-kpi-card__delta--${deltaTone}`}>
              <TrendArrow direction={delta.direction} />
              <span className="bg-num">{delta.value}</span>
            </span>
          ) : null}
        </div>
        {hint ? <div className="bg-kpi-card__hint">{hint}</div> : null}
      </div>
    </div>
  );
}
