/** Palette guard — tokens.css is the standard (decision BGEN-BRAND-01).
 *
 *  The token layer is only a single source of truth if nothing bypasses it.
 *  Two things bypass it in practice:
 *
 *    1. Tailwind colour utilities (`text-blue-700`, `bg-slate-100`). These look
 *       harmless and are how the auth screens ended up shipping a blue that is
 *       not in the BillGen palette at all.
 *    2. Raw hex in component code.
 *
 *  Either one means re-skinning the product no longer works by remapping the
 *  `--bg-*` layer, which is the whole property the design system is built on.
 *
 *  This test walks the real source tree rather than trusting review.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { expect, test } from "vitest";

const REPO = resolve(__dirname, "../../..");

/** App + design-system source. Scaffold is excluded on purpose — see below. */
const ROOTS = [
  "frontend-saas/src",
  "frontend-electron/src",
  "frontend-react/src",
  "henrioutai-ui/src/components",
];

function sourceFiles(dir: string): string[] {
  const abs = join(REPO, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return []; // a frontend that does not exist yet (mobile) is not a failure
  }
  return entries.flatMap((entry) => {
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) return sourceFiles(join(dir, entry));
    if (!/\.tsx?$/.test(entry)) return [];
    if (/\.test\.tsx?$/.test(entry)) return [];
    return [join(dir, entry)];
  });
}

const FILES = ROOTS.flatMap(sourceFiles);

test("the source tree is actually being scanned", () => {
  // Guards against the walker silently returning nothing and the two real
  // assertions below passing vacuously.
  expect(FILES.length).toBeGreaterThan(40);
});

test("no Tailwind colour utilities — colour comes from the token layer", () => {
  const PALETTE_UTILITY =
    /\b(?:text|bg|border|ring|from|via|to|decoration|outline|divide|shadow)-(?:gray|slate|blue|red|green|emerald|zinc|neutral|stone|amber|yellow|orange|indigo|violet|purple|sky|teal|cyan|lime|rose|pink|fuchsia)-\d{2,3}\b/g;

  const offenders: string[] = [];
  for (const file of FILES) {
    const source = readFileSync(join(REPO, file), "utf8");
    for (const match of source.matchAll(PALETTE_UTILITY)) {
      offenders.push(`${relative(REPO, join(REPO, file))}: ${match[0]}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("no raw hex in component or panel code", () => {
  // Icons are exempt: an SVG may legitimately carry currentColor fallbacks, and
  // the scaffold kit is exempt by design — it is deliberately off-brand, and
  // using tokens there would destroy the signal it exists to send.
  //
  // The two workspace files below are exempt for a different and narrower
  // reason, added 2026-08-28. This guard exists to keep colour out of the
  // *app's chrome*, so that re-skinning the product works by remapping the
  // `--bg-*` layer. A **document** is not chrome: an invoice is the customer's
  // own stationery, and a company that cannot put its brand colour on it will
  // not use the template studio at all.
  //
  // So these two hold document colour as *data* — the swatch list a user picks
  // from, and each starter model's colour — and nothing else. The exemption is
  // by exact filename rather than by directory precisely so it cannot spread:
  // every other file under workspace/ is still scanned, and the studio's own
  // chrome (its thumbnails, panels and rails) uses tokens like everything else.
  const EXEMPT =
    /(?:[\\/]icons[\\/]|[\\/]scaffold[\\/]|[\\/]workspace[\\/](?:templateSchema|templatePresets)\.ts$)/;
  const HEX = /#[0-9a-fA-F]{3,8}\b/g;

  const offenders: string[] = [];
  for (const file of FILES) {
    if (EXEMPT.test(file)) continue;
    const source = readFileSync(join(REPO, file), "utf8");
    for (const match of source.matchAll(HEX)) {
      offenders.push(`${file}: ${match[0]}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("the document-colour exemption stays narrow", () => {
  // The exemption above is the kind that spreads. This pins it: only those two
  // files may carry raw colour, and only as data. If a third file needs it, that
  // is a decision worth making deliberately rather than by editing a regex.
  const exempt = FILES.filter((file) =>
    /[\\/]workspace[\\/].*\.tsx?$/.test(file) &&
    /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(join(REPO, file), "utf8")),
  ).map((file) => file.replace(/\\/g, "/").split("/").pop());

  expect(exempt.sort()).toEqual(["templatePresets.ts", "templateSchema.ts"]);
});

test("the accent token is emerald, not the reference's blue", () => {
  // BGEN-BRAND-01, decided 2026-08-25: the Studio AI reference repointed
  // --bg-accent at --brand-blue-500. tokens.css is the standard, so emerald
  // stays. This pins the decision so a future re-skin is deliberate.
  const tokens = readFileSync(
    join(REPO, "henrioutai-ui/src/styles/tokens.css"),
    "utf8",
  );
  expect(tokens).toMatch(/--brand-green-500:\s*#10b981/i);
  expect(tokens).toMatch(/--bg-accent:\s*var\(--brand-green-500\)/);
  expect(tokens).not.toMatch(/--bg-accent:\s*var\(--brand-blue/);
  expect(tokens).toMatch(/--bg-font-sans:\s*"Satoshi"/);
});
