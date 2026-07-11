import type { ReactNode } from "react";

export interface AppShellProps {
  /** Global chrome — typically <TopNav …>. Sticky at the top while content scrolls. */
  nav?: ReactNode;
  /** Content column: default 1100px, wide 1400px, full = no max-width. */
  width?: "default" | "wide" | "full";
  children: ReactNode;
  className?: string;
}

/**
 * The outer frame every screen renders inside: brand-tinted gradient
 * backdrop (what makes the glass surfaces read as 3D), sticky nav slot,
 * centered content column. Mount once around the router outlet.
 */
export function AppShell({ nav, width = "default", children, className }: AppShellProps) {
  const classes = ["bg-app-shell", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {nav ? <div className="bg-app-shell__nav">{nav}</div> : null}
      <main className={`bg-app-shell__content bg-app-shell__content--${width}`}>
        {children}
      </main>
    </div>
  );
}
