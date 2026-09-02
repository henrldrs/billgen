import { cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const autoId = useId();
  const classes = ['bg-field', className].filter(Boolean).join(' ');

  let labelFor = htmlFor;
  let content = children;
  if (labelFor == null && isValidElement(children)) {
    const child = children as ReactElement<{ id?: string }>;
    if (child.props.id != null) {
      labelFor = child.props.id;
    } else {
      labelFor = autoId;
      content = cloneElement(child, { id: autoId });
    }
  }

  return (
    <div className={classes}>
      <label
        className={required ? 'bg-field__label bg-field__label--required' : 'bg-field__label'}
        htmlFor={labelFor}
      >
        {label}
      </label>
      {content}
      {error != null ? (
        <p className="bg-field__error" role="alert">
          {error}
        </p>
      ) : hint != null ? (
        <p className="bg-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}
