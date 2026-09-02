import type { ReactNode } from 'react';

export interface IconChipProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'accent' | 'navy';
  shape?: 'square' | 'circle';
  active?: boolean;
  children: ReactNode;
  className?: string;
}

export function IconChip({
  size = 'md',
  tone = 'neutral',
  shape = 'square',
  active = false,
  children,
  className,
}: IconChipProps) {
  const classes = [
    'bg-icon-chip',
    `bg-icon-chip--${size}`,
    `bg-icon-chip--${tone}`,
    shape === 'circle' ? 'bg-icon-chip--circle' : '',
    active ? 'bg-icon-chip--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      <span className="bg-icon-chip__icon">{children}</span>
    </span>
  );
}
