import { useEffect, useRef, useState } from "react";

export interface CopyButtonProps {
  /** The exact text put on the clipboard. */
  value: string;
  /** Accessible name; also the tooltip-ish title. */
  label?: string;
  className?: string;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 3.5v-.25A1.25 1.25 0 0 0 9.25 2h-5.5A1.25 1.25 0 0 0 2.5 3.25v5.5A1.25 1.25 0 0 0 3.75 10H4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Copy-to-clipboard with inline confirmation: the icon flips to a check for
 * ~1.6s. Falls back to a hidden textarea + execCommand where the async
 * Clipboard API is unavailable (non-secure contexts).
 */
export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    }
  };

  const classes = [
    "bg-copy",
    copied ? "bg-copy--copied" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={classes}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={copy}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span role="status" className="bg-copy__sr">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
