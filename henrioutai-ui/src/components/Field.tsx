import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

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
 *
 * Label wiring: pass `htmlFor` + an `id` on the input yourself, or — when the
 * child is a single element without an `id` — Field generates one and injects
 * it, so the label association works out of the box.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const autoId = useId();
  const classes = ["bg-field", className].filter(Boolean).join(" ");

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
        className={required ? "bg-field__label bg-field__label--required" : "bg-field__label"}
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
