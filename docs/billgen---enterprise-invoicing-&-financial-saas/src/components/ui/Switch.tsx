import type { ReactNode } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const classes = [
    'bg-switch',
    checked ? 'bg-switch--on' : '',
    disabled ? 'bg-switch--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="bg-switch__track" aria-hidden="true">
        <span className="bg-switch__thumb" />
      </span>
      {label != null ? <span className="bg-switch__label">{label}</span> : null}
    </button>
  );
}
