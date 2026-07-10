import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  /** Clickable label rendered next to the box. */
  label: ReactNode;
  /** Secondary line under the label. */
  hint?: ReactNode;
}

/** Boolean input with its label built in, multi-select-capable. */
export function Checkbox({ label, hint, className, ...rest }: CheckboxProps) {
  const classes = ["bg-choice", rest.disabled ? "bg-choice--disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={classes}>
      <input type="checkbox" className="bg-choice__input" {...rest} />
      <span className="bg-choice__text">
        <span className="bg-choice__label">{label}</span>
        {hint != null ? <span className="bg-choice__hint">{hint}</span> : null}
      </span>
    </label>
  );
}
