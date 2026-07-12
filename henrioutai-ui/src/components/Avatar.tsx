export interface AvatarProps {
  /** Full name — used for initials (first two words) and the alt/title. */
  name: string;
  /** Optional image; falls back to initials while absent. */
  src?: string;
  size?: "sm" | "md" | "lg";
  /** Chip tint behind initials. */
  tone?: "accent" | "navy" | "neutral";
  className?: string;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + second).toUpperCase();
}

/**
 * User/entity avatar: image when available, gradient chip with Satoshi
 * Semibold initials otherwise. Non-interactive — wrap it (Menu trigger,
 * button) when it needs to do something.
 */
export function Avatar({ name, src, size = "md", tone = "accent", className }: AvatarProps) {
  const classes = [
    "bg-avatar",
    `bg-avatar--${size}`,
    src ? "" : `bg-avatar--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} title={name}>
      {src ? (
        <img className="bg-avatar__img" src={src} alt={name} />
      ) : (
        <span className="bg-avatar__initials" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
