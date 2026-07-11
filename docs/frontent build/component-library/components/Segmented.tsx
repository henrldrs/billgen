import type { ReactNode } from "react";

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Optional leading icon — sized by CSS. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<V extends string = string> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Segmented control — a compact pick-one strip (2–4 options). The shared
 * primitive behind ThemeSwitcher and LanguageSwitcher; use it directly for
 * any other small exclusive choice (view density, chart range…).
 */
export function Segmented<V extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: SegmentedProps<V>) {
  const classes = ["bg-segmented", `bg-segmented--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={classes}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            className={[
              "bg-segmented__option",
              active ? "bg-segmented__option--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? <span className="bg-segmented__icon">{option.icon}</span> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
