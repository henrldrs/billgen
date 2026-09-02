import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, rows = 3, ...rest }: TextareaProps) {
  const classes = ['bg-field__input', invalid ? 'bg-field__input--invalid' : '', className]
    .filter(Boolean)
    .join(' ');
  return <textarea rows={rows} {...rest} className={classes} aria-invalid={invalid || undefined} />;
}
