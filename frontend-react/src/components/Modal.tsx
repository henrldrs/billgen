import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  /** Backdrop click, × button and Escape all call this. Omit to force a footer action. */
  onClose?: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Right-aligned action buttons below the body. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Centered overlay for focused tasks — the second elevation level: overlay
 * glass (stronger blur + shadow than cards) over a dimmed, blurred backdrop.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", className }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const classes = ["bg-modal", `bg-modal--${size}`, className].filter(Boolean).join(" ");
  return (
    <div className="bg-modal__backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={classes} onClick={(e) => e.stopPropagation()}>
        <div className="bg-modal__header">
          <h2 className="bg-modal__title">{title}</h2>
          {onClose ? (
            <button type="button" className="bg-modal__close" aria-label="Close" onClick={onClose}>
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
