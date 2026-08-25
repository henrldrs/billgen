import { useEffect, useId } from "react";
import type { ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  /** Backdrop click, × button and Escape all call this. */
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Right-aligned action buttons pinned to the bottom. */
  footer?: ReactNode;
  side?: "right" | "left";
  size?: "md" | "lg";
  className?: string;
}

/**
 * Slide-in side panel for secondary content without leaving the page —
 * same overlay-glass elevation as Modal, edge-anchored. Use it for detail
 * views (invoice preview, client card), Modal for focused tasks.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  size = "md",
  className,
}: DrawerProps) {
  // A dialog with no accessible name is announced as just "dialog". Binding the
  // visible title is the whole fix, and it also lets two open dialogs (a drawer
  // with a modal over it) be told apart.
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const classes = [
    "bg-drawer",
    `bg-drawer--${side}`,
    `bg-drawer--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="bg-drawer__backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={classes}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-drawer__header">
          <h2 className="bg-drawer__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="bg-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="bg-drawer__body">{children}</div>
        {footer != null ? <div className="bg-drawer__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
