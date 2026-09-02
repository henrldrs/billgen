import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  size?: 'md' | 'lg';
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  size = 'md',
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const classes = [
    'bg-drawer',
    `bg-drawer--${side}`,
    `bg-drawer--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="bg-drawer__backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={classes} onClick={(e) => e.stopPropagation()}>
        <div className="bg-drawer__header">
          <h2 className="bg-drawer__title">{title}</h2>
          <button type="button" className="bg-modal__close" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="bg-drawer__body">{children}</div>
        {footer != null ? <div className="bg-drawer__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
