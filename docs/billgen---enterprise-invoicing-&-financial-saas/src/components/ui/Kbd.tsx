export interface KbdProps {
  keys: string[];
  className?: string;
}

export function Kbd({ keys, className }: KbdProps) {
  const classes = ['bg-kbd', className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      {keys.map((k, i) => (
        <kbd key={i} className="bg-kbd__key">
          {k}
        </kbd>
      ))}
    </span>
  );
}
