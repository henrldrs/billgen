import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Optional leading icon — one of the icons/ components, sized by CSS. */
  icon?: ReactNode;
  /** Optional trailing count (e.g. open invoices per tab). */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Horizontal section switcher within a page — underline style. Roving
 * tabindex: Left/Right/Home/End move focus and select. Panels are the
 * caller's job (render by activeKey).
 */
export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const classes = ["bg-tabs", className].filter(Boolean).join(" ");

  const enabled = items.filter((t) => !t.disabled);

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowRight: (i) => (i + 1) % enabled.length,
      ArrowLeft: (i) => (i - 1 + enabled.length) % enabled.length,
      Home: () => 0,
      End: () => enabled.length - 1,
    };
    const move = keys[event.key];
    if (!move || enabled.length === 0) return;
    event.preventDefault();
    const current = Math.max(0, enabled.findIndex((t) => t.key === activeKey));
    const next = enabled[move(current)];
    onChange(next.key);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab-key="${next.key}"]`)
      ?.focus();
  };

  return (
    <div ref={listRef} role="tablist" className={classes} onKeyDown={onKeyDown}>
      {items.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            data-tab-key={tab.key}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            className={["bg-tabs__tab", active ? "bg-tabs__tab--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(tab.key)}
          >
            {tab.icon ? <span className="bg-tabs__icon">{tab.icon}</span> : null}
            {tab.label}
            {tab.count != null ? (
              <span className="bg-tabs__count bg-num">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
