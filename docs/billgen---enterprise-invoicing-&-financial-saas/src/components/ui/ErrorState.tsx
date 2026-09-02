import type { ReactNode } from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: ReactNode;
  message: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const classes = ['bg-error-state', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <div className="bg-error-state__icon">⚠️</div>
      <h3 className="bg-error-state__title">{title}</h3>
      <p className="bg-error-state__message">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
