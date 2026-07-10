import type { ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  /** id of the input inside — wires the label's htmlFor. */
  htmlFor?: string;
  /** Neutral helper text under the input. Hidden while an error shows. */
  hint?: ReactNode;
  /** Error message; also style the input itself via its `invalid` prop. */
  error?: ReactNode;
  /** Appends a required marker to the label. */
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Label + input + hint/error wrapper. Builds on the .bg-field classes the
 * real components.css already ships; adds hint text and a required marker.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const classes = ["bg-field", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <label className="bg-field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="bg-field__required" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
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
