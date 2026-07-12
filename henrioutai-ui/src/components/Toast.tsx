import type { ReactNode } from "react";

export interface ToastProps {
  tone?: "success" | "error" | "info";
  message: ReactNode;
  onDismiss?: () => void;
}

/**
 * Transient, non-blocking status message. Presentational only — the app owns
 * the list and timers; render Toasts inside a ToastStack.
 */
export function Toast({ tone = "info", message, onDismiss }: ToastProps) {
  return (
    <div className={`bg-toast bg-toast--${tone}`} role="status">
      <span className="bg-toast__dot" aria-hidden="true" />
      <span className="bg-toast__message">{message}</span>
      {onDismiss ? (
        <button type="button" className="bg-toast__dismiss" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      ) : null}
    </div>
  );
}

export interface ToastStackProps {
  children: ReactNode;
}

/** Fixed bottom-right column that Toasts stack into. */
export function ToastStack({ children }: ToastStackProps) {
  return <div className="bg-toast-stack">{children}</div>;
}
