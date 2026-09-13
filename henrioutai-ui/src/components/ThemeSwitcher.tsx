import { Segmented } from "./Segmented";

/** `system` follows the operating system's own light/dark setting and tracks
 *  it live. It is a preference, not a theme: the app resolves it to one of
 *  the other two before setting `data-bg-theme`. */
export type ThemeValue = "light" | "dark" | "system";

export interface ThemeSwitcherLabels {
  light: string;
  dark: string;
  system: string;
  /** Accessible name of the whole control. */
  group: string;
}

export interface ThemeSwitcherProps {
  theme: ThemeValue;
  /** Persist + apply is the app's job: set data-bg-theme="dark" on <html>. */
  onChange: (theme: ThemeValue) => void;
  size?: "sm" | "md";
  /** Offer the system option. On by default; the top-bar shortcut hides it
   *  because three words do not fit beside the company switcher. */
  withSystem?: boolean;
  labels?: Partial<ThemeSwitcherLabels>;
  className?: string;
}

const DEFAULT_LABELS: ThemeSwitcherLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
  group: "Theme",
};

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M13.2 9.9A5.6 5.6 0 0 1 6.1 2.8a5.6 5.6 0 1 0 7.1 7.1Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 13.5h5M8 11.25v2.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Light / dark / system toggle over the Segmented primitive. Controlled: the
 * app keeps the value (usually in localStorage) and flips data-bg-theme on
 * <html> — the token layer does the rest.
 */
export function ThemeSwitcher({
  theme,
  onChange,
  size = "md",
  withSystem = true,
  labels: labelOverrides,
  className,
}: ThemeSwitcherProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const options = [
    { value: "light" as const, label: labels.light, icon: <SunIcon /> },
    { value: "dark" as const, label: labels.dark, icon: <MoonIcon /> },
    ...(withSystem ? [{ value: "system" as const, label: labels.system, icon: <SystemIcon /> }] : []),
  ];
  // Without the system option a `system` preference is shown as neither
  // pressed — a lie of omission; the shortcut is for flipping, not reading.
  return (
    <Segmented<ThemeValue>
      ariaLabel={labels.group}
      size={size}
      className={className}
      value={theme}
      onChange={onChange}
      options={options}
    />
  );
}
