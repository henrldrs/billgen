import type { ReactNode } from 'react';

export interface ChartWrapperProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  actions?: ReactNode;
  height?: number | string;
  children: ReactNode;
  className?: string;
}

export function ChartWrapper({
  title,
  subtitle,
  legend,
  actions,
  height = 240,
  children,
  className,
}: ChartWrapperProps) {
  const classes = ['bg-chart-wrapper', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {title || actions ? (
        <div className="bg-chart-wrapper__header">
          <div className="bg-chart-wrapper__titles">
            {title ? <h4 className="bg-chart-wrapper__title">{title}</h4> : null}
            {subtitle ? <p className="bg-chart-wrapper__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="bg-chart-wrapper__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="bg-chart-wrapper__body" style={{ minHeight: height }}>
        {children}
      </div>
      {legend ? <div className="bg-chart-wrapper__legend">{legend}</div> : null}
    </div>
  );
}
