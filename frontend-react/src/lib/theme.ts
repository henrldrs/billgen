/** Dark mode = one token remap: data-bg-theme="dark" on <html>. The app owns
 *  persistence (localStorage) and the attribute; the token layer does the rest.
 *
 *  Lives in the package because both shells had it, byte-identical apart from a
 *  comment (T-19). The storage key is shared and that is harmless: the two
 *  surfaces are different origins, so neither can read the other's value.
 *
 *  Three values since 2026-09-13: `system` follows the operating system and
 *  tracks it live, which is what a laptop that goes dark at sunset expects.
 *  It is the default for a fresh install — Henri's onboarding spec lists it
 *  as an option and the settings spec calls it "OS system sync"; a person who
 *  set their machine dark did not do it to be shown a white screen. A stored
 *  `light` or `dark` from before this change keeps meaning what it meant. */

import type { ThemeValue } from "@henrioutai/ui";
import { useEffect, useState } from "react";

const STORAGE_KEY = "billgen-theme";
const QUERY = "(prefers-color-scheme: dark)";

export function storedTheme(): ThemeValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    /* private mode */
  }
  return "system";
}

/** What the preference means on this machine right now. */
export function resolveTheme(preference: ThemeValue): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

export function applyTheme(preference: ThemeValue): void {
  if (resolveTheme(preference) === "dark") {
    document.documentElement.setAttribute("data-bg-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-bg-theme");
  }
}

export function useTheme(): [ThemeValue, (theme: ThemeValue) => void] {
  const [theme, setTheme] = useState<ThemeValue>(storedTheme);
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode — theme just won't persist */
    }
    // Only `system` has anything to follow. A fixed choice ignores the OS.
    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const follow = () => applyTheme("system");
    media.addEventListener?.("change", follow);
    return () => media.removeEventListener?.("change", follow);
  }, [theme]);
  return [theme, setTheme];
}
