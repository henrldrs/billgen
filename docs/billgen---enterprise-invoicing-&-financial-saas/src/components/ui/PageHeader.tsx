import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import { BackIcon } from './icons/BackIcon';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, onBack, className }: PageHeaderProps) {
  const classes = ['bg-page-header', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {onBack ? (
        <IconButton aria-label="Retour" onClick={onBack}>
          <BackIcon />
        </IconButton>
      ) : null}
      <div className="bg-page-header__titles">
        <h1 className="bg-page-header__title">{title}</h1>
        {subtitle != null ? <p className="bg-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions != null ? <div className="bg-page-header__actions">{actions}</div> : null}
    </div>
  );
}
