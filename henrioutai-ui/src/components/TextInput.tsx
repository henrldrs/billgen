import type { InputHTMLAttributes } from "react";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error styling; pair with a Field `error` message. */
  invalid?: boolean;
}

/** Single-line text input styled by the existing .bg-field__input class. */
export function TextInput({ invalid, className, ...rest }: TextInputProps) {
  const classes = ["bg-field__input", invalid ? "bg-field__input--invalid" : "", className]
    .filter(Boolean)
    .join(" ");
  return <input type={rest.type ?? "text"} {...rest} className={classes} aria-invalid={invalid || undefined} />;
}
