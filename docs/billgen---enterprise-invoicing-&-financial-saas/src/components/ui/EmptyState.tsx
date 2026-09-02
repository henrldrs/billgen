import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const classes = ['bg-empty-state', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {icon ? <div className="bg-empty-state__icon">{icon}</div> : null}
      <h3 className="bg-empty-state__title">{title}</h3>
      {description ? <p className="bg-empty-state__desc">{description}</p> : null}
      {action ? <div className="bg-empty-state__action">{action}</div> : null}
    </div>
  );
}
