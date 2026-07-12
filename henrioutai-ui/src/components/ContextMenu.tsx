import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { MenuEntry } from "./Menu";

export interface ContextMenuProps {
  /** Same entry shape as Menu — items, separators, danger, hints. */
  items: MenuEntry[];
  /** The surface that owns the right-click (a table row, a card, a list). */
  children: ReactNode;
  className?: string;
}

/**
 * Right-click positional menu. Wraps its children; right-clicking anywhere
 * inside opens the menu at the cursor (clamped to the viewport). Reuses the
 * Menu popup look and keyboard behavior; left-click actions stay untouched.
 */
export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onDocPointerDown = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onDocPointerDown);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, [at]);

  /* Clamp into the viewport once rendered, then focus the first item. */
  useEffect(() => {
    if (!at || !popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const x = Math.min(at.x, window.innerWidth - rect.width - 8);
    const y = Math.min(at.y, window.innerHeight - rect.height - 8);
    if (x !== at.x || y !== at.y) {
      setAt({ x: Math.max(8, x), y: Math.max(8, y) });
      return;
    }
    popupRef.current
      .querySelector<HTMLButtonElement>(".bg-menu__item:not(:disabled)")
      ?.focus();
  }, [at]);

  const onContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    setAt({ x: event.clientX, y: event.clientY });
  };

  const onPopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setAt(null);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const focusable = [
      ...(popupRef.current?.querySelectorAll<HTMLButtonElement>(
        ".bg-menu__item:not(:disabled)"
      ) ?? []),
    ];
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    focusable[(current + delta + focusable.length) % focusable.length].focus();
  };

  const classes = ["bg-context-menu", className].filter(Boolean).join(" ");
  return (
    <div className={classes} onContextMenu={onContextMenu}>
      {children}
      {at ? (
        <div
          ref={popupRef}
          role="menu"
          className="bg-menu__popup bg-context-menu__popup"
          style={{ left: at.x, top: at.y }}
          onKeyDown={onPopupKeyDown}
        >
          {items.map((entry) =>
            entry.type === "separator" ? (
              <div key={entry.key} role="separator" className="bg-menu__separator" />
            ) : (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                className={[
                  "bg-menu__item",
                  entry.danger ? "bg-menu__item--danger" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={entry.disabled}
                onClick={() => {
                  setAt(null);
                  entry.onSelect?.();
                }}
              >
                {entry.icon ? <span className="bg-menu__icon">{entry.icon}</span> : null}
                <span className="bg-menu__label">{entry.label}</span>
                {entry.hint ? <span className="bg-menu__hint">{entry.hint}</span> : null}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
