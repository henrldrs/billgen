/** The language control in the top bar.
 *
 *  A menu rather than four buttons: four is already crowded next to the company
 *  switcher, and a fifth language would break the row rather than the menu.
 *
 *  It shows the short code (FR, NL, EN, ES) rather than a flag. A flag is a
 *  country and a language is not — Dutch is not the Netherlands to a Belgian,
 *  and Spanish is not Spain to most of the people who speak it. The codes are
 *  also legible at the size a top bar allows, which flags at 16px are not.
 */

import { useEffect, useRef, useState } from "react";

import { LANGS, type Lang } from "../lib/translations";
import { useLang } from "../providers/LanguageProvider";

export interface LanguageToggleProps {
  /** Rendered label for assistive technology. The visible control is a code. */
  ariaLabel?: string;
}

export function LanguageToggle({ ariaLabel = "Language" }: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((entry) => entry.value === lang) ?? LANGS[0];

  return (
    <div className="bg-langtoggle" ref={root}>
      <button
        type="button"
        className="bg-langtoggle__trigger"
        aria-label={`${ariaLabel} — ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{current.short}</span>
      </button>

      {open ? (
        <div className="bg-langtoggle__menu" role="menu" aria-label={ariaLabel}>
          {LANGS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="menuitemradio"
              aria-checked={entry.value === lang}
              className={
                entry.value === lang
                  ? "bg-langtoggle__item is-active"
                  : "bg-langtoggle__item"
              }
              // The label is written in its own language: someone looking for
              // Dutch is looking for "Nederlands", not for "Dutch" spelled out
              // in a language they are trying to leave.
              lang={entry.value}
              onClick={() => {
                setLang(entry.value as Lang);
                setOpen(false);
              }}
            >
              <span className="bg-langtoggle__code" aria-hidden="true">
                {entry.short}
              </span>
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
