import { LogoMark } from "./LogoMark";
import { IconChip } from "./icons/IconChip";

export interface HomeButtonProps {
  onNavigateHome?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** The logo, acting as the app's home button — replaces the generic brand tile. */
export function HomeButton({ onNavigateHome, size = "lg", className }: HomeButtonProps) {
  const classes = ["bg-home-button", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} onClick={onNavigateHome} aria-label="Home">
      <IconChip size={size} tone="neutral">
        <LogoMark size={20} />
      </IconChip>
    </button>
  );
}
