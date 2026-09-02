export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  const classes = ['bg-skeleton', `bg-skeleton--${variant}`, className].filter(Boolean).join(' ');
  return (
    <span
      className={classes}
      style={{
        width: width ?? (variant === 'circle' ? 36 : '100%'),
        height: height ?? (variant === 'text' ? '1em' : variant === 'circle' ? 36 : 80),
      }}
      aria-hidden="true"
    />
  );
}
