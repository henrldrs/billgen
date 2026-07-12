import type { ReactNode, SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Closed list of choices; alternatively pass <option> children. */
  options?: SelectOption[];
  /** Disabled first option shown until a real value is picked. */
  placeholder?: string;
  /** Error styling; pair with a Field `error` message. */
  invalid?: boolean;
  children?: ReactNode;
}

/** Single choice from a closed list, styled by the existing .bg-field__input class. */
export function Select({ options, placeholder, invalid, className, children, ...rest }: SelectProps) {
  const classes = ["bg-field__input", invalid ? "bg-field__input--invalid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <select {...rest} className={classes} aria-invalid={invalid || undefined}>
      {placeholder != null ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
      {children}
    </select>
  );
}
