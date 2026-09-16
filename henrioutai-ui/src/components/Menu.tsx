import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface MenuItemData {
  type?: "item";
  key: string;
  label: ReactNode;
  /** Leading icon — one of the icons/ components, sized by CSS. */
  icon?: ReactNode;
  /** Right-aligned helper (shortcut, count). */
  hint?: ReactNode;
  /** Destructive styling (sign out, void, delete). */
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface MenuSeparator {
  type: "separator";
  key: string;
}

export type MenuEntry = MenuItemData | MenuSeparator;

export interface MenuProps {
  /** Trigger content — rendered inside the trigger button. */
  trigger: ReactNode;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  items: MenuEntry[];
  /** Non-interactive block above the items (e.g. account identity). */
  header?: ReactNode;
  /** Popup edge alignment relative to the trigger. */
  align?: "start" | "end";
  /** Which way the popup opens. `above` is for a trigger that sits at the
   *  bottom of the viewport — a sheet's action bar — where a popup opening
   *  downward would open off the screen. */
  placement?: "below" | "above";
  className?: string;
}

/**
 * Dropdown menu — overlay glass (elevation 2). Self-contained open state:
 * click toggles, Escape/outside-click/select closes, arrow keys move focus,
 * focus returns to the trigger on close. No portal — parent stacking
 * contexts with overflow clipping need care, same as Tooltip.
 */
export function Menu({
  trigger,
  triggerAriaLabel,
  triggerClassName,
  items,
  header,
  align = "start",
  placement = "below",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLButtonElement>(".bg-menu__item:not(:disabled)")
      ?.focus();
  }, [open]);

  const close = (refocusTrigger: boolean) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  const focusableItems = () => [
    ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
      ".bg-menu__item:not(:disabled)"
    ) ?? []),
  ];

  const onPopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const focusable = focusableItems();
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + focusable.length) % focusable.length;
    focusable[next].focus();
  };

  const classes = ["bg-menu", className].filter(Boolean).join(" ");
  const triggerClasses = ["bg-menu__trigger", triggerClassName].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={classes}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
          // Escape used to be heard only inside the popup. Focus is on the
          // trigger with the popup open after Shift+Tab out of it, or when
          // the first item was disabled — and there Escape did nothing (T-47).
          // Stopped here so an overlay behind the menu does not close too.
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            close(true);
          }
        }}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          className={`bg-menu__popup bg-menu__popup--${align} bg-menu__popup--${placement}`}
          onKeyDown={onPopupKeyDown}
        >
          {header ? <div className="bg-menu__header">{header}</div> : null}
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
                  close(true);
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
