import type { ReactNode } from 'react';

export interface DividerProps {
  label?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ label, orientation = 'horizontal', className }: DividerProps) {
  const classes = [
    'bg-divider',
    `bg-divider--${orientation}`,
    label ? 'bg-divider--labeled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (orientation === 'vertical') {
    return <span className={classes} role="separator" aria-orientation="vertical" />;
  }

  return (
    <div className={classes} role="separator">
      {label ? <span className="bg-divider__label">{label}</span> : null}
    </div>
  );
}
