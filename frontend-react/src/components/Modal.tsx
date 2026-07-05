import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="bg-modal__backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-modal__header">
          <h2 className="bg-modal__title">{title}</h2>
          <button
            type="button"
            className="bg-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="bg-modal__body">{children}</div>
      </div>
    </div>
  );
}
