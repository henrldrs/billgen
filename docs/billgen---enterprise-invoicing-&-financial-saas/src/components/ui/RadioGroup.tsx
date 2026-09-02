import type { ReactNode } from 'react';

export interface RadioOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  direction?: 'column' | 'row';
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  direction = 'column',
  disabled,
  className,
}: RadioGroupProps) {
  const classes = ['bg-radio-group', `bg-radio-group--${direction}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role="radiogroup">
      {options.map((opt) => {
        const isDisabled = disabled || opt.disabled;
        const itemClasses = ['bg-choice', isDisabled ? 'bg-choice--disabled' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <label key={opt.value} className={itemClasses}>
            <input
              type="radio"
              className="bg-choice__input"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange?.(opt.value)}
              disabled={isDisabled}
            />
            <span className="bg-choice__text">
              <span className="bg-choice__label">{opt.label}</span>
              {opt.hint != null ? <span className="bg-choice__hint">{opt.hint}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
