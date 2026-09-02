import type { ReactNode } from 'react';

export interface StepItem {
  id: string | number;
  label: ReactNode;
  description?: ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  const classes = ['bg-stepper', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {steps.map((step, idx) => {
        const isPassed = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isPending = idx > currentStep;
        const itemClasses = [
          'bg-stepper__step',
          isPassed ? 'bg-stepper__step--passed' : '',
          isCurrent ? 'bg-stepper__step--current' : '',
          isPending ? 'bg-stepper__step--pending' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={step.id} className={itemClasses} onClick={() => onStepClick?.(idx)}>
            <div className="bg-stepper__indicator">
              <span className="bg-stepper__badge bg-num">
                {isPassed ? '✓' : idx + 1}
              </span>
              {idx < steps.length - 1 ? <span className="bg-stepper__track" /> : null}
            </div>
            <div className="bg-stepper__info">
              <span className="bg-stepper__label">{step.label}</span>
              {step.description ? (
                <span className="bg-stepper__desc">{step.description}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
