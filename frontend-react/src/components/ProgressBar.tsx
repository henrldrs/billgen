export interface ProgressBarProps {
  /** 0–100. Omit for an indeterminate sweep. */
  value?: number;
  /** Accessible name for the bar. */
  label?: string;
  /** Show the percentage next to the track (determinate only). */
  showValue?: boolean;
  className?: string;
}

/** Determinate or indeterminate progress indicator. */
export function ProgressBar({ value, label, showValue, className }: ProgressBarProps) {
  const indeterminate = value === undefined;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value));
  const classes = ["bg-progress", indeterminate ? "bg-progress--indeterminate" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <div
        className="bg-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
      >
        <div className="bg-progress__fill" style={indeterminate ? undefined : { width: `${clamped}%` }} />
      </div>
      {showValue && !indeterminate ? <span className="bg-progress__value bg-num">{clamped}%</span> : null}
    </div>
  );
}
