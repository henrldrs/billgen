import type { ReactNode } from 'react';

export interface ToastProps {
  id: string;
  tone?: 'info' | 'success' | 'error';
  message: ReactNode;
  onDismiss?: (id: string) => void;
}

export function ToastContainer({ children }: { children: ReactNode }) {
  return <div className="bg-toast-container">{children}</div>;
}

export function Toast({ id, tone = 'info', message, onDismiss }: ToastProps) {
  return (
    <div className={`bg-toast bg-toast--${tone}`} role="status">
      <span className="bg-toast__icon">
        {tone === 'success' ? '✓' : tone === 'error' ? '!' : 'ℹ'}
      </span>
      <span className="bg-toast__msg">{message}</span>
      {onDismiss ? (
        <button type="button" className="bg-toast__close" onClick={() => onDismiss(id)} aria-label="Fermer">
          ×
        </button>
      ) : null}
    </div>
  );
}
