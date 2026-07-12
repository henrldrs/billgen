import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

export interface OrgItem {
  key: string;
  name: string;
  /** Small print under the name — VAT number, plan, role. */
  detail?: string;
}

export interface OrgSwitcherProps {
  /** The companies/workspaces this account can act as. */
  orgs: OrgItem[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Renders a "+ New company" footer action when provided. */
  onCreateNew?: () => void;
  createLabel?: string;
  className?: string;
}

function Caret() {
  return (
    <svg className="bg-org__caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Company/workspace switcher — BillGen's multi-company pattern, generalized.
 * Trigger shows the active org's avatar + name; the popup lists all orgs
 * with a check on the active one. Sits in TopNav's children slot.
 */
export function OrgSwitcher({
  orgs,
  activeKey,
  onChange,
  onCreateNew,
  createLabel = "New company",
  className,
}: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = orgs.find((o) => o.key === activeKey) ?? orgs[0];

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const classes = ["bg-org", className].filter(Boolean).join(" ");
  return (
    <div ref={rootRef} className={classes}>
      <button
        ref={triggerRef}
        type="button"
        className="bg-org__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={active?.name ?? "?"} size="sm" tone="navy" />
        <span className="bg-org__name">{active?.name}</span>
        <Caret />
      </button>
      {open ? (
        <div role="listbox" aria-label="Switch company" className="bg-org__popup">
          {orgs.map((org) => {
            const isActive = org.key === active?.key;
            return (
              <button
                key={org.key}
                type="button"
                role="option"
                aria-selected={isActive}
                className={[
                  "bg-org__option",
                  isActive ? "bg-org__option--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) onChange(org.key);
                }}
              >
                <Avatar name={org.name} size="sm" tone={isActive ? "accent" : "neutral"} />
                <span className="bg-org__text">
                  <span className="bg-org__option-name">{org.name}</span>
                  {org.detail ? (
                    <span className="bg-org__option-detail">{org.detail}</span>
                  ) : null}
                </span>
                {isActive ? (
                  <span className="bg-org__check" aria-hidden="true">
                    <Check />
                  </span>
                ) : null}
              </button>
            );
          })}
          {onCreateNew ? (
            <>
              <div role="separator" className="bg-menu__separator" />
              <button
                type="button"
                className="bg-org__create"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
              >
                + {createLabel}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
