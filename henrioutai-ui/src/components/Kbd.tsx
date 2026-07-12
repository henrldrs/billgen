import type { ReactNode } from "react";

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** Small styled key-combo label — <Kbd>⌘</Kbd> <Kbd>K</Kbd>. */
export function Kbd({ children, className }: KbdProps) {
  const classes = ["bg-kbd", className].filter(Boolean).join(" ");
  return <kbd className={classes}>{children}</kbd>;
}
