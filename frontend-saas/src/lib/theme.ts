/** Dark mode = one token remap: data-bg-theme="dark" on <html>. The app owns
 *  persistence (localStorage) and the attribute; the token layer does the rest. */

import type { ThemeValue } from "@billgen/ui";
import { useEffect, useState } from "react";

const STORAGE_KEY = "billgen-theme";

export function storedTheme(): ThemeValue {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemeValue): void {
  if (theme === "dark") {
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
  }, [theme]);
  return [theme, setTheme];
}
