import type { InputHTMLAttributes } from "react";
import { useId } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className="bg-field">
      <label className="bg-field__label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="bg-field__input" aria-invalid={Boolean(error)} {...rest} />
      {error ? (
        <div role="alert" className="bg-field__error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
