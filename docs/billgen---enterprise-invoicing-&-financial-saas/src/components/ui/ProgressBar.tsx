import type { ReactNode } from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: ReactNode;
  hint?: ReactNode;
  tone?: 'accent' | 'navy' | 'danger' | 'warning';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  hint,
  tone = 'accent',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const classes = ['bg-progress', `bg-progress--${tone}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {label || hint ? (
        <div className="bg-progress__header">
          {label ? <span className="bg-progress__label">{label}</span> : null}
          {hint ? <span className="bg-progress__hint bg-num">{hint}</span> : null}
        </div>
      ) : null}
      <div className="bg-progress__track" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        <div className="bg-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
