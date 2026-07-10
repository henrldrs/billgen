import type { ReactNode } from "react";

/** Shared layout helpers for the gallery pages. Preview-only, never shipped. */

export interface GalleryProps {
  /** Report an interaction to the global "Last action" strip. */
  onAction: (msg: string) => void;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.1rem", borderBottom: "2px solid var(--bg-ink)", paddingBottom: "0.4rem" }}>
        {title}
      </h2>
      <div style={{ marginTop: "1.25rem" }}>{children}</div>
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.25rem" }}>
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: "0.75rem", color: "var(--bg-ink-soft)", marginTop: "0.35rem" }}>{children}</div>;
}
