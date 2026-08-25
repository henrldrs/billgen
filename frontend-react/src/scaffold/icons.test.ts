/** Icon grammar guard — BGEN-BRAND-03, decided 2026-08-25.
 *
 *  One icon language across SaaS, Windows and Mobile. The failure this prevents
 *  is the "Frankenstein effect": three surfaces each drifting to a slightly
 *  different icon set until the product looks assembled rather than designed.
 *  The Studio AI reference shows exactly that — it mixes custom SVG, lucide and
 *  emoji in one app, three visual grammars competing.
 *
 *  Decision: BillGen keeps its own custom SVG set. lucide is acceptable only as
 *  a WHOLESALE replacement, never alongside. Emoji are never UI.
 *
 *  The rules below are the mechanical half of the grammar. The CSS half —
 *  sizing and the idle/hover/active/disabled states — lives in tokens.css.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { expect, test } from "vitest";

const REPO = resolve(__dirname, "../../..");
const ICON_DIR = join(REPO, "henrioutai-ui/src/components/icons");

const ICONS = readdirSync(ICON_DIR).filter(
  (file) => file.endsWith("Icon.tsx") && !file.includes(".test."),
);

function iconSource(file: string) {
  return readFileSync(join(ICON_DIR, file), "utf8");
}

test("there are icons to check", () => {
  expect(ICONS.length).toBeGreaterThan(5);
});

test("one geometry grid — every icon is 24x24", () => {
  // Mixed grids are why icons stop aligning optically in a nav row: a 20-grid
  // icon next to a 24-grid one reads as slightly the wrong size at every size.
  const offenders = ICONS.filter(
    (file) => !iconSource(file).includes('viewBox="0 0 24 24"'),
  );
  expect(offenders).toEqual([]);
});

test("one stroke weight — every stroked shape is 2px", () => {
  const offenders: string[] = [];
  for (const file of ICONS) {
    for (const match of iconSource(file).matchAll(/strokeWidth="([^"]+)"/g)) {
      if (match[1] !== "2") offenders.push(`${file}: strokeWidth=${match[1]}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("one corner logic — round caps and joins throughout", () => {
  const offenders: string[] = [];
  for (const file of ICONS) {
    for (const match of iconSource(file).matchAll(/strokeLine(?:cap|join)="([^"]+)"/g)) {
      if (match[1] !== "round") offenders.push(`${file}: ${match[0]}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("one colour grammar — currentColor only, never a literal", () => {
  // An icon must inherit the tone of whatever it sits in. The moment one
  // hardcodes a colour it stops responding to hover, active, disabled and dark
  // mode, and it is the first thing to look wrong after a re-skin.
  const offenders: string[] = [];
  for (const file of ICONS) {
    const source = iconSource(file);
    for (const match of source.matchAll(/(?:stroke|fill)="([^"]+)"/g)) {
      const value = match[1];
      if (value === "currentColor" || value === "none") continue;
      offenders.push(`${file}: ${match[0]}`);
    }
    expect(source, `${file} should not carry raw hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  }
  expect(offenders).toEqual([]);
});

test("icons are stroked, not filled", () => {
  const offenders = ICONS.filter((file) => !iconSource(file).includes('fill="none"'));
  expect(offenders).toEqual([]);
});

test("the interaction grammar is defined as tokens, not per component", () => {
  const tokens = readFileSync(
    join(REPO, "henrioutai-ui/src/styles/tokens.css"),
    "utf8",
  );
  expect(tokens).toMatch(/--bg-icon-idle-opacity:\s*0?\.8/);
  expect(tokens).toMatch(/--bg-icon-hover-opacity:\s*1/);
  expect(tokens).toMatch(/--bg-icon-disabled-opacity:\s*0?\.4/);
});

test("no emoji anywhere in UI code", () => {
  // Emoji are a third icon grammar wearing a disguise: they render differently
  // per platform, ignore the colour tokens, and cannot take a hover or disabled
  // state. The reference frontend uses ~18 of them.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const ROOTS = [
    "frontend-saas/src",
    "frontend-electron/src",
    "frontend-react/src",
    "henrioutai-ui/src",
  ];

  const walk = (dir: string): string[] => {
    let entries: string[];
    try {
      entries = readdirSync(join(REPO, dir), { withFileTypes: true }).map((e) =>
        e.isDirectory() ? `dir:${e.name}` : e.name,
      );
    } catch {
      return [];
    }
    return entries.flatMap((entry) => {
      if (entry.startsWith("dir:")) return walk(join(dir, entry.slice(4)));
      if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
      const path = join(dir, entry);
      // The scaffold kit is exempt, exactly as it is from the palette rules:
      // it is deliberately off-brand, and its warning glyph is part of the
      // signal that a screen is unfinished. Separators are normalised because
      // join() yields backslashes on Windows and forward slashes elsewhere.
      if (path.replace(/\\/g, "/").includes("/scaffold/")) return [];
      return [path];
    });
  };

  const offenders: string[] = [];
  for (const file of ROOTS.flatMap(walk)) {
    const source = readFileSync(join(REPO, file), "utf8");
    source.split("\n").forEach((line, index) => {
      if (EMOJI.test(line)) offenders.push(`${file}:${index + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});

test("no icon library is a dependency — the custom set is the grammar", () => {
  // lucide is acceptable only as a wholesale replacement. Adding it alongside
  // the custom set is what produces two grammars, so the dependency itself is
  // the tripwire.
  for (const pkg of [
    "henrioutai-ui/package.json",
    "frontend-react/package.json",
    "frontend-saas/package.json",
    "frontend-electron/package.json",
  ]) {
    const manifest = readFileSync(join(REPO, pkg), "utf8");
    expect(manifest, `${pkg} should not pull an icon library`).not.toMatch(
      /"(?:lucide-react|react-icons|@heroicons\/react|feather-icons)"/,
    );
  }
});
