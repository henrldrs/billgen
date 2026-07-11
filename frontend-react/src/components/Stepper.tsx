import type { ReactNode } from "react";

export interface StepItem {
  key: string;
  label: ReactNode;
  /** Small print under the label. */
  description?: ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  /** Key of the current step; everything before it renders as completed. */
  activeKey: string;
  /** When set, completed steps become clickable (go back to fix things). */
  onStepClick?: (key: string) => void;
  className?: string;
}

function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Numbered step indicator for multi-step flows (onboarding, invoice wizard).
 * Completed steps show a check and — with onStepClick — are clickable;
 * the current step carries the accent; upcoming steps stay muted.
 */
export function Stepper({ steps, activeKey, onStepClick, className }: StepperProps) {
  const activeIndex = Math.max(0, steps.findIndex((s) => s.key === activeKey));
  const classes = ["bg-stepper", className].filter(Boolean).join(" ");
  return (
    <ol className={classes}>
      {steps.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming";
        const clickable = state === "done" && !!onStepClick;
        const marker = (
          <span className="bg-stepper__marker" aria-hidden="true">
            {state === "done" ? <CheckMark /> : <span className="bg-num">{i + 1}</span>}
          </span>
        );
        const text = (
          <span className="bg-stepper__text">
            <span className="bg-stepper__label">{step.label}</span>
            {step.description ? (
              <span className="bg-stepper__desc">{step.description}</span>
            ) : null}
          </span>
        );
        return (
          <li
            key={step.key}
            className={`bg-stepper__step bg-stepper__step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            {clickable ? (
              <button
                type="button"
                className="bg-stepper__button"
                onClick={() => onStepClick(step.key)}
              >
                {marker}
                {text}
              </button>
            ) : (
              <span className="bg-stepper__button bg-stepper__button--static">
                {marker}
                {text}
              </span>
            )}
            {i < steps.length - 1 ? (
              <span className="bg-stepper__connector" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
