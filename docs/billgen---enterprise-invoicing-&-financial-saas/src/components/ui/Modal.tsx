import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const classes = ['bg-modal', `bg-modal--${size}`, className].filter(Boolean).join(' ');
  return (
    <div className="bg-modal__backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={classes} onClick={(e) => e.stopPropagation()}>
        <div className="bg-modal__header">
          <h2 className="bg-modal__title">{title}</h2>
          {onClose ? (
            <button type="button" className="bg-modal__close" aria-label="Fermer" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
        <div className="bg-modal__body">{children}</div>
        {footer != null ? <div className="bg-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
