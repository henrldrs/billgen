/** Appearance preferences are attributes on <html> that the token layer
 *  reads. A choice must land there immediately and survive a reload. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { storedAppearance } from "../lib/preferences";
import { storedTheme } from "../lib/theme";
import { AppearancePanel } from "./AppearancePanel";

afterEach(() => {
  localStorage.clear();
  for (const name of ["data-bg-density", "data-bg-text", "data-bg-motion", "data-bg-glass", "data-bg-theme"]) {
    document.documentElement.removeAttribute(name);
  }
});

test("density, text size, motion and translucency write the root attributes and persist", async () => {
  render(<AppearancePanel />);

  await userEvent.click(screen.getByRole("radio", { name: "Compact" }));
  expect(document.documentElement.getAttribute("data-bg-density")).toBe("compact");

  await userEvent.click(screen.getByRole("radio", { name: "Large" }));
  expect(document.documentElement.getAttribute("data-bg-text")).toBe("large");

  await userEvent.click(screen.getByRole("switch", { name: "Reduce motion" }));
  expect(document.documentElement.getAttribute("data-bg-motion")).toBe("reduced");

  await userEvent.click(screen.getByRole("switch", { name: "Translucent surfaces" }));
  expect(document.documentElement.getAttribute("data-bg-glass")).toBe("off");

  expect(storedAppearance()).toEqual({
    density: "compact",
    textSize: "large",
    reducedMotion: true,
    translucency: false,
  });

  //  Back to the defaults removes the attributes rather than writing them:
  //  a fresh install has nothing "set".
  await userEvent.click(screen.getByRole("radio", { name: "Comfortable" }));
  expect(document.documentElement.hasAttribute("data-bg-density")).toBe(false);
});

test("the theme control offers the system option and a fresh install follows it", async () => {
  expect(storedTheme()).toBe("system");
  render(<AppearancePanel />);

  await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
  expect(document.documentElement.getAttribute("data-bg-theme")).toBe("dark");
  expect(storedTheme()).toBe("dark");

  await userEvent.click(screen.getByRole("radio", { name: "System" }));
  expect(storedTheme()).toBe("system");
  //  jsdom has no matchMedia, which resolves as light — the attribute goes.
  expect(document.documentElement.hasAttribute("data-bg-theme")).toBe(false);
});
