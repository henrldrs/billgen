import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error styling; pair with a Field `error` message. */
  invalid?: boolean;
}

/** Multi-line text input styled by the existing .bg-field__input class. */
export function Textarea({ invalid, className, rows = 3, ...rest }: TextareaProps) {
  const classes = ["bg-field__input", invalid ? "bg-field__input--invalid" : "", className]
    .filter(Boolean)
    .join(" ");
  return <textarea rows={rows} {...rest} className={classes} aria-invalid={invalid || undefined} />;
}
