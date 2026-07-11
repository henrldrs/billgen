import { Segmented } from "./Segmented";

export type ThemeValue = "light" | "dark";

export interface ThemeSwitcherProps {
  theme: ThemeValue;
  /** Persist + apply is the app's job: set data-bg-theme="dark" on <html>. */
  onChange: (theme: ThemeValue) => void;
  size?: "sm" | "md";
  className?: string;
}

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

/**
 * Light/dark toggle over the Segmented primitive. Controlled: the app keeps
 * the value (usually in localStorage) and flips data-bg-theme on <html> —
 * the token layer does the rest.
 */
export function ThemeSwitcher({ theme, onChange, size = "md", className }: ThemeSwitcherProps) {
  return (
    <Segmented<ThemeValue>
      ariaLabel="Theme"
      size={size}
      className={className}
      value={theme}
      onChange={onChange}
      options={[
        { value: "light", label: "Light", icon: <SunIcon /> },
        { value: "dark", label: "Dark", icon: <MoonIcon /> },
      ]}
    />
  );
}
