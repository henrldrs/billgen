import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...rest }: TextInputProps) {
  const classes = ['bg-field__input', invalid ? 'bg-field__input--invalid' : '', className]
    .filter(Boolean)
    .join(' ');
  return <input type={rest.type ?? 'text'} {...rest} className={classes} aria-invalid={invalid || undefined} />;
}
