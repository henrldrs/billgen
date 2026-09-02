import type { ReactNode } from 'react';

export interface AppShellProps {
  nav?: ReactNode;
  width?: 'default' | 'wide' | 'full';
  children: ReactNode;
  className?: string;
}

export function AppShell({ nav, width = 'default', children, className }: AppShellProps) {
  const classes = ['bg-app-shell', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {nav ? <div className="bg-app-shell__nav">{nav}</div> : null}
      <main className={`bg-app-shell__content bg-app-shell__content--${width}`}>
        {children}
      </main>
    </div>
  );
}
