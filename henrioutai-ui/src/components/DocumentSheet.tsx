import { useEffect, useId } from "react";
import type { ReactNode } from "react";

export interface DocumentSheetProps {
  open: boolean;
  /** Backdrop click, × button and Escape all call this. */
  onClose: () => void;
  /** The accessible name. Rendered in the chrome above the paper, not on it —
   *  a sheet of paper does not carry a window title. */
  title: ReactNode;
  /** The document itself. Rendered on the paper. */
  children: ReactNode;
  /** Actions, in a bar under the paper rather than on it. */
  footer?: ReactNode;
  /** Paper proportion. `a4` holds the sheet at 1 : √2 until the content is
   *  longer than that, which is what makes a short invoice still read as a
   *  page instead of a strip. `auto` fits the content. */
  ratio?: "a4" | "auto";
  className?: string;
}

/**
 * A document, centred, on paper.
 *
 * The third overlay alongside Modal and Drawer, and it exists because the
 * other two say the wrong thing about an invoice. A drawer is for secondary
 * content beside the page you are still on — but an invoice is not an aside,
 * it is the thing itself, and a side panel forces the document into a column
 * narrower than the table it contains. A modal is for a focused *task*; this
 * carries no task, only a record.
 *
 * So: centred, on a paper-coloured sheet held at A4 proportion, with the
 * actions in a bar *under* the paper. Nothing chrome-like touches the sheet —
 * no title bar, no close button on the page — because the whole point is that
 * what is on screen is recognisably what the client will receive.
 *
 * Same overlay elevation as Modal, and it mounts in the same place, so it
 * obeys the same stacking rules.
 */
export function DocumentSheet({
  open,
  onClose,
  title,
  children,
  footer,
  ratio = "a4",
  className,
}: DocumentSheetProps) {
  // Binds the visible title as the dialog's accessible name — the title sits
  // in the chrome above the paper, so a screen reader still gets "Invoice
  // OUT-BC06012026, dialog" rather than just "dialog".
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
  const classes = ["bg-docsheet", `bg-docsheet--${ratio}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="bg-docsheet__backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-docsheet__frame"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-docsheet__chrome">
          <h2 className="bg-docsheet__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="bg-docsheet__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* The paper. `tabIndex` because it scrolls: a scrollable region that
            cannot be focused cannot be scrolled from the keyboard, and this one
            is often taller than the window. */}
        <div className={classes} tabIndex={0}>
          {children}
        </div>

        {footer != null ? <div className="bg-docsheet__actions">{footer}</div> : null}
      </div>
    </div>
  );
}
