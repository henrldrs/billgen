import type { ReactNode } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Clickable label rendered next to the track. */
  label?: ReactNode;
  disabled?: boolean;
  /** Accessible name when no visible label is given. */
  "aria-label"?: string;
  className?: string;
}

/**
 * Instant-effect boolean (vs. Checkbox = form-submitted boolean). Rendered as
 * a button with role="switch"; the track/thumb are pure CSS.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  const classes = [
    "bg-switch",
    checked ? "bg-switch--on" : "",
    disabled ? "bg-switch--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="bg-switch__track" aria-hidden="true">
        <span className="bg-switch__thumb" />
      </span>
      {label != null ? <span className="bg-switch__label">{label}</span> : null}
    </button>
  );
}
