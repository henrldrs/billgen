import type { ReactNode } from 'react';

export interface SuccessStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SuccessState({ title, description, action, className }: SuccessStateProps) {
  const classes = ['bg-success-state', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <div className="bg-success-state__icon">✓</div>
      <h3 className="bg-success-state__title">{title}</h3>
      {description ? <p className="bg-success-state__desc">{description}</p> : null}
      {action ? <div className="bg-success-state__action">{action}</div> : null}
    </div>
  );
}
