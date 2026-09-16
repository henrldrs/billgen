/** Appearance preferences: what is stored is what comes back, and the root
 *  attributes say exactly what is set — a default is nothing set. */

import { DEFAULT_APPEARANCE, applyAppearance, storedAppearance } from "./preferences";

afterEach(() => {
  localStorage.clear();
  for (const name of ["data-bg-density", "data-bg-text", "data-bg-width", "data-bg-motion", "data-bg-glass"]) {
    document.documentElement.removeAttribute(name);
  }
});

test("a fresh install is fluid, and fluid sets no attribute", () => {
  expect(storedAppearance().containerWidth).toBe("fluid");
  applyAppearance(DEFAULT_APPEARANCE);
  expect(document.documentElement.hasAttribute("data-bg-width")).toBe(false);
});

test("boxed survives a reload and is written to the root", () => {
  // T-50: what the panel stores is what the next paint reads, before React.
  localStorage.setItem("billgen.appearance", JSON.stringify({ containerWidth: "boxed" }));
  const reloaded = storedAppearance();
  expect(reloaded.containerWidth).toBe("boxed");
  expect(reloaded.density).toBe("comfortable"); // the rest keeps its defaults

  applyAppearance(reloaded);
  expect(document.documentElement.getAttribute("data-bg-width")).toBe("boxed");
});

test("a value this build does not know falls back to fluid rather than throwing", () => {
  localStorage.setItem("billgen.appearance", JSON.stringify({ containerWidth: "narrow" }));
  expect(storedAppearance().containerWidth).toBe("fluid");
  localStorage.setItem("billgen.appearance", "not json");
  expect(storedAppearance()).toEqual(DEFAULT_APPEARANCE);
});
