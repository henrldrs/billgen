export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  className?: string;
}

export function Avatar({
  name,
  src,
  size = 'md',
  shape = 'circle',
  className,
}: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const classes = [
    'bg-avatar',
    `bg-avatar--${size}`,
    `bg-avatar--${shape}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return <img src={src} alt={name} className={classes} />;
  }

  return (
    <span className={classes}>
      <span className="bg-avatar__initials">{initials}</span>
    </span>
  );
}
