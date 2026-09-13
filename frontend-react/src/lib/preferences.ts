/** Appearance preferences that are not the theme: density, text size, motion
 *  and translucency. Per person, per machine, and never on the server — they
 *  describe the screen in front of someone, not the business — so they live
 *  in localStorage beside the theme and are applied the same way: attributes
 *  on <html> that the token layer reads (tokens.css, components.css).
 *
 *  Applied before first paint by both shells' `main.tsx`, so a compact,
 *  large-text, no-blur screen never flashes the defaults first.
 *
 *  From Henri's `docs/appearance for saas.txt` and `settings exhaustive
 *  list.txt`: density (compact / comfortable / spacious), font scaling,
 *  reduced motion, glassmorphism off. The accent picker and the colour-blind
 *  palettes are not here: the accent is guard-pinned (BRAND_TOKENS) and a
 *  palette override is a design decision, not a preference. */

import { useCallback, useState } from "react";

export type Density = "compact" | "comfortable" | "spacious";
export type TextSize = "small" | "medium" | "large";

export interface Appearance {
  density: Density;
  textSize: TextSize;
  /** Off = animations and transitions run. On = they do not. */
  reducedMotion: boolean;
  /** Off = plain surfaces, no backdrop blur; for a weak GPU or a preference. */
  translucency: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  density: "comfortable",
  textSize: "medium",
  reducedMotion: false,
  translucency: true,
};

const STORAGE_KEY = "billgen.appearance";
const DENSITIES: Density[] = ["compact", "comfortable", "spacious"];
const SIZES: TextSize[] = ["small", "medium", "large"];

export function storedAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      density: DENSITIES.includes(parsed.density as Density) ? (parsed.density as Density) : DEFAULT_APPEARANCE.density,
      textSize: SIZES.includes(parsed.textSize as TextSize) ? (parsed.textSize as TextSize) : DEFAULT_APPEARANCE.textSize,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_APPEARANCE.reducedMotion,
      translucency: typeof parsed.translucency === "boolean" ? parsed.translucency : DEFAULT_APPEARANCE.translucency,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** Writes the attributes the stylesheets read. A default value removes its
 *  attribute rather than writing it, so the stylesheet's own defaults apply
 *  and nothing about a fresh install is "set". */
export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement;
  const set = (name: string, value: string | null) => {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  };
  set("data-bg-density", appearance.density === "comfortable" ? null : appearance.density);
  set("data-bg-text", appearance.textSize === "medium" ? null : appearance.textSize);
  set("data-bg-motion", appearance.reducedMotion ? "reduced" : null);
  set("data-bg-glass", appearance.translucency ? null : "off");
}

export function applyStoredAppearance(): void {
  applyAppearance(storedAppearance());
}

export function useAppearance(): [Appearance, (patch: Partial<Appearance>) => void] {
  const [appearance, setAppearance] = useState<Appearance>(storedAppearance);
  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch };
      applyAppearance(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode — applies for this session only */
      }
      return next;
    });
  }, []);
  return [appearance, update];
}
