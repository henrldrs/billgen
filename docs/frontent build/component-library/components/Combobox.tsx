import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Right-aligned helper (VAT number, city…). */
  hint?: ReactNode;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  /** Selected option value, or null. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Shown inside the popup when the query matches nothing. */
  emptyText?: string;
  className?: string;
}

/**
 * Searchable select (closed list). Typing filters; Up/Down move the
 * highlight, Enter selects, Esc closes, × clears. Reuses the field input
 * look and the overlay-glass popup.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  id,
  invalid,
  disabled,
  emptyText = "No matches.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.trim().toLowerCase())
  );

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
      ?.querySelector<HTMLLIElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const openPopup = () => {
    if (disabled) return;
    setQuery("");
    setHighlight(Math.max(0, filtered.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const select = (option: ComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery("");
    inputRef.current?.focus();
  };

  const moveHighlight = (delta: number) => {
    const enabled = filtered
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.disabled);
    if (enabled.length === 0) return;
    const pos = enabled.findIndex(({ i }) => i === highlight);
    const next = enabled[(pos + delta + enabled.length) % enabled.length];
    setHighlight(next.i);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openPopup();
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      if (open && filtered[highlight]) {
        event.preventDefault();
        select(filtered[highlight]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.stopPropagation();
        setOpen(false);
      }
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const classes = ["bg-combobox", className].filter(Boolean).join(" ");
  const inputClasses = [
    "bg-field__input",
    "bg-combobox__input",
    invalid ? "bg-field__input--invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={classes}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${highlight}` : undefined}
        className={inputClasses}
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        onFocus={openPopup}
        onClick={() => {
          if (!open) openPopup();
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />
      {selected && !disabled ? (
        <button
          type="button"
          className="bg-combobox__clear"
          aria-label="Clear selection"
          onClick={() => {
            onChange(null);
            setQuery("");
            inputRef.current?.focus();
          }}
        >
          ×
        </button>
      ) : (
        <span className="bg-combobox__caret" aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {open ? (
        <ul ref={listRef} id={listboxId} role="listbox" className="bg-combobox__popup">
          {filtered.length === 0 ? (
            <li className="bg-combobox__empty">{emptyText}</li>
          ) : (
            filtered.map((option, i) => (
              <li
                key={option.value}
                id={`${listboxId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={[
                  "bg-combobox__option",
                  i === highlight ? "bg-combobox__option--highlighted" : "",
                  option.value === value ? "bg-combobox__option--selected" : "",
                  option.disabled ? "bg-combobox__option--disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => {
                  if (!option.disabled) setHighlight(i);
                }}
                onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                onClick={() => select(option)}
              >
                <span className="bg-combobox__option-label">{option.label}</span>
                {option.hint ? (
                  <span className="bg-combobox__option-hint">{option.hint}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
