import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconChip, type IconChipProps } from './icons/IconChip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: IconChipProps['size'];
  tone?: IconChipProps['tone'];
  dot?: boolean;
  'aria-label': string;
}

export function IconButton({
  children,
  size = 'md',
  tone = 'neutral',
  dot = false,
  className,
  ...rest
}: IconButtonProps) {
  const classes = ['bg-icon-button', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} {...rest}>
      <IconChip size={size} tone={tone}>
        {children}
      </IconChip>
      {dot ? <span className="bg-icon-chip__dot" /> : null}
    </button>
  );
}
