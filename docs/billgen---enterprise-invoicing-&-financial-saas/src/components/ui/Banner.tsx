import type { ReactNode } from 'react';

export interface BannerProps {
  tone?: 'info' | 'success' | 'warn' | 'danger';
  title?: ReactNode;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Banner({ tone = 'info', title, children, onDismiss, className }: BannerProps) {
  const classes = ['bg-banner', `bg-banner--${tone}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="bg-banner__dot" aria-hidden="true" />
      <span className="bg-banner__text">
        {title != null ? <strong className="bg-banner__title">{title}</strong> : null}
        {children}
      </span>
      {onDismiss ? (
        <button type="button" className="bg-banner__dismiss" aria-label="Fermer" onClick={onDismiss}>
          ×
        </button>
      ) : null}
    </div>
  );
}
