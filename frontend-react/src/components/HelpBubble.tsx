import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HelpIcon } from "./icons/HelpIcon";

export interface HelpLink {
  key: string;
  label: ReactNode;
  /** Right-aligned helper ("2 min", "opens mail"). */
  hint?: ReactNode;
  onSelect: () => void;
}

export interface HelpBubbleProps {
  title?: ReactNode;
  /** Free intro content above the links. */
  children?: ReactNode;
  links?: HelpLink[];
  className?: string;
}

/**
 * Floating support launcher — fixed bottom-left circular button opening a
 * small overlay-glass panel (intro + support links). Bottom-left on purpose:
 * bottom-right belongs to the toast stack. Mount once in the app shell.
 */
export function HelpBubble({ title = "Need a hand?", children, links = [], className }: HelpBubbleProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const classes = ["bg-help", className].filter(Boolean).join(" ");
  return (
    <div ref={rootRef} className={classes}>
      {open ? (
        <div role="dialog" aria-label="Help" className="bg-help__panel">
          <div className="bg-help__title">{title}</div>
          {children ? <div className="bg-help__body">{children}</div> : null}
          {links.length > 0 ? (
            <div className="bg-help__links">
              {links.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  className="bg-help__link"
                  onClick={() => {
                    setOpen(false);
                    link.onSelect();
                  }}
                >
                  <span className="bg-help__link-label">{link.label}</span>
                  {link.hint ? <span className="bg-help__link-hint">{link.hint}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        className="bg-help__launcher"
        aria-label="Help and support"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpIcon />
      </button>
    </div>
  );
}
