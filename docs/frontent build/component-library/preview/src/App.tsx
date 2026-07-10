import { useEffect, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import { BrandGallery } from "./galleries/BrandGallery";
import { IconGallery } from "./galleries/IconGallery";
import { ActionGallery } from "./galleries/ActionGallery";
import { NavGallery } from "./galleries/NavGallery";
import { LayoutGallery } from "./galleries/LayoutGallery";
import { FormGallery } from "./galleries/FormGallery";
import { FeedbackGallery } from "./galleries/FeedbackGallery";
import { DataGallery } from "./galleries/DataGallery";
import { ShellGallery } from "./galleries/ShellGallery";
import { P1NavDataGallery } from "./galleries/P1NavDataGallery";
import type { GalleryProps } from "./ui";

interface Batch {
  key: string;
  label: string;
  /** Marks the newest slice — highlighted in the picker, selected by default. */
  isNew?: boolean;
  Gallery: ComponentType<GalleryProps>;
}

const BATCHES: Batch[] = [
  { key: "brand", label: "Brand & identity", Gallery: BrandGallery },
  { key: "icons", label: "Icons", Gallery: IconGallery },
  { key: "actions", label: "Buttons & actions", Gallery: ActionGallery },
  { key: "nav", label: "Navigation", Gallery: NavGallery },
  { key: "layout", label: "Layout", Gallery: LayoutGallery },
  { key: "forms", label: "Forms", Gallery: FormGallery },
  { key: "feedback", label: "Feedback & overlays", Gallery: FeedbackGallery },
  { key: "data", label: "Data display", Gallery: DataGallery },
  { key: "shell", label: "App shell & account", Gallery: ShellGallery },
  { key: "p1nav", label: "P1: nav & KPIs", isNew: true, Gallery: P1NavDataGallery },
];

const NEW_KEYS = BATCHES.filter((b) => b.isNew).map((b) => b.key);

/** Selection lives in the URL hash (#layout,forms) so reload/share keeps it. */
function readHash(): string[] {
  const keys = window.location.hash.replace(/^#/, "").split(",").filter(Boolean);
  const valid = keys.filter((k) => BATCHES.some((b) => b.key === k));
  return valid.length > 0 ? valid : NEW_KEYS;
}

type Theme = "light" | "dark";

export function App() {
  const [lastAction, setLastAction] = useState("(none yet — click / hover things below)");
  const [selected, setSelected] = useState<string[]>(readHash);
  const [theme, setTheme] = useState<Theme>(
    () => (window.localStorage.getItem("bg-theme") === "dark" ? "dark" : "light")
  );

  useEffect(() => {
    window.history.replaceState(null, "", `#${selected.join(",")}`);
  }, [selected]);

  /* Dark mode is a token-layer remap keyed off this attribute — the toggle
   * proves every component flips with zero component-CSS changes. */
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.dataset.bgTheme = "dark";
    } else {
      delete document.documentElement.dataset.bgTheme;
    }
    window.localStorage.setItem("bg-theme", theme);
  }, [theme]);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const shown = BATCHES.filter((b) => selected.includes(b.key));

  const chipStyle = (on: boolean): CSSProperties => ({
    border: on ? "1px solid var(--bg-accent)" : "1px solid var(--bg-line)",
    background: on ? "var(--bg-accent-soft)" : "color-mix(in srgb, var(--bg-surface) 60%, transparent)",
    color: on ? "var(--bg-accent-ink)" : "var(--bg-ink-soft)",
    borderRadius: 999,
    padding: "0.35rem 0.85rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "var(--bg-tracking-button)",
    cursor: "pointer",
    boxShadow: on ? "var(--bg-shadow-sm)" : "none",
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Component Library Preview</h1>
      <p style={{ color: "var(--bg-ink-soft)", marginTop: 0 }}>
        Isolated build — nothing here is wired into frontend-react/frontend-saas.
      </p>

      <div
        style={{
          position: "sticky",
          top: "0.75rem",
          zIndex: 10,
          background: "linear-gradient(135deg, var(--bg-glass-from), var(--bg-glass-to))",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid var(--bg-glass-border)",
          borderRadius: 16,
          padding: "0.7rem 1.1rem",
          marginBottom: "2rem",
          fontSize: "0.85rem",
          boxShadow: "var(--bg-shadow-card)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem" }}>
          <strong style={{ marginRight: "0.3rem" }}>Batches:</strong>
          {BATCHES.map((b) => (
            <button key={b.key} type="button" style={chipStyle(selected.includes(b.key))} onClick={() => toggle(b.key)}>
              {b.label}
              {b.isNew ? " ✦ new" : ""}
            </button>
          ))}
          <span style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              style={chipStyle(theme === "dark")}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "☀ light" : "☾ dark"}
            </button>
            <button type="button" style={chipStyle(false)} onClick={() => setSelected(NEW_KEYS)}>
              newest slice
            </button>
            <button type="button" style={chipStyle(false)} onClick={() => setSelected(BATCHES.map((b) => b.key))}>
              all
            </button>
          </span>
        </div>
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--bg-line)", paddingTop: "0.5rem" }}>
          <strong>Last action:</strong> {lastAction}
        </div>
      </div>

      {shown.length === 0 ? (
        <p style={{ color: "var(--bg-ink-soft)" }}>No batch selected — pick one above.</p>
      ) : (
        shown.map((b) => (
          <div key={b.key}>
            <h2
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--bg-accent-ink)",
                margin: "0 0 1rem",
              }}
            >
              ── {b.label} ──
            </h2>
            <b.Gallery onAction={setLastAction} />
          </div>
        ))
      )}
    </div>
  );
}
