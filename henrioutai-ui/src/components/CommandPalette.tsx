import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface CommandItem {
  key: string;
  label: string;
  /** Right-aligned hint — a shortcut ("N") or context ("settings"). */
  hint?: ReactNode;
  /** Leading icon — one of the icons/ components, sized by CSS. */
  icon?: ReactNode;
  /** Group header the command sorts under. */
  section?: string;
  /** Extra match terms beyond the label. */
  keywords?: string;
  onRun: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
  placeholder?: string;
  /** Shown when the query matches nothing. */
  emptyText?: string;
  className?: string;
}

/**
 * ⌘K-style global search + quick actions: centered overlay glass, fuzzy-ish
 * substring filter over label + keywords, grouped by section, Up/Down +
 * Enter, Esc closes. Controlled — bind your own global hotkey to `open`
 * (the preview wires Ctrl/⌘K).
 */
export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = "Type a command or search…",
  emptyText = "Nothing matches.",
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords ?? ""} ${c.section ?? ""}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  /* Flat order (as filtered) drives keyboard nav; sections only group visually. */
  const sections = useMemo(() => {
    const bySection = new Map<string, { item: CommandItem; flatIndex: number }[]>();
    filtered.forEach((item, flatIndex) => {
      const s = item.section ?? "";
      if (!bySection.has(s)) bySection.set(s, []);
      bySection.get(s)!.push({ item, flatIndex });
    });
    return [...bySection.entries()];
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      /* focus after the dialog paints */
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-flat-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  if (!open) return null;

  const run = (item: CommandItem) => {
    onClose();
    item.onRun();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + delta + filtered.length) % filtered.length);
    } else if (event.key === "Enter") {
      if (filtered[highlight]) {
        event.preventDefault();
        run(filtered[highlight]);
      }
    }
  };

  const classes = ["bg-palette", className].filter(Boolean).join(" ");
  return (
    <div className="bg-palette__backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={classes}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          type="text"
          className="bg-palette__input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          aria-label="Search commands"
        />
        <div ref={listRef} className="bg-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="bg-palette__empty">{emptyText}</div>
          ) : (
            sections.map(([section, entries]) => (
              <div key={section || "(none)"} className="bg-palette__section">
                {section ? <div className="bg-palette__section-title">{section}</div> : null}
                {entries.map(({ item, flatIndex }) => (
                  <div
                    key={item.key}
                    data-flat-index={flatIndex}
                    role="option"
                    aria-selected={flatIndex === highlight}
                    className={[
                      "bg-palette__item",
                      flatIndex === highlight ? "bg-palette__item--highlighted" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => setHighlight(flatIndex)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => run(item)}
                  >
                    {item.icon ? <span className="bg-palette__icon">{item.icon}</span> : null}
                    <span className="bg-palette__label">{item.label}</span>
                    {item.hint ? <span className="bg-palette__hint">{item.hint}</span> : null}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="bg-palette__footer" aria-hidden="true">
          <span><kbd className="bg-kbd">↑↓</kbd> navigate</span>
          <span><kbd className="bg-kbd">↵</kbd> run</span>
          <span><kbd className="bg-kbd">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
