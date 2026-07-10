import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { SearchIcon } from "./icons/SearchIcon";

export interface SearchBarProps {
  /** Controlled value; omit to let the component manage its own state. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Fired on Enter with the current query. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Dedicated query input: leading search icon, clear button once there's
 * text, Enter submits. Works controlled or uncontrolled.
 */
export function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Search…",
  disabled,
  className,
}: SearchBarProps) {
  const [internal, setInternal] = useState("");
  const query = value ?? internal;

  const setQuery = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSubmit?.(query);
    if (e.key === "Escape") setQuery("");
  };

  const classes = ["bg-searchbar", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <span className="bg-searchbar__icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        type="search"
        role="searchbox"
        className="bg-searchbar__input"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      {query.length > 0 ? (
        <button
          type="button"
          className="bg-searchbar__clear"
          aria-label="Clear search"
          onClick={() => setQuery("")}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
