/** Route-shadowing guard.
 *
 *  Both surfaces mount routes from two places: buildAppRoutes() emits one for
 *  every IA node that owns a path, and App.tsx declares a few by hand for the
 *  things that are actions rather than destinations. Both render inside the
 *  same <Routes>, and when two routes claim the same path the FIRST declared
 *  wins — which is always the generated one, because buildAppRoutes() runs
 *  first in the tree.
 *
 *  That is not a theoretical hazard. Client 360 and Invoice detail were both
 *  declared in App.tsx against paths the IA already owned, so neither ever
 *  rendered: every visit fell through to the bare scaffold page, and because a
 *  scaffold page is what an unbuilt screen is *supposed* to look like, nothing
 *  about it looked wrong. Two screens were dead for as long as they existed.
 *
 *  A screen claims its node through the BUILT map in shell/routes.tsx. This
 *  test enforces that, by reading the real source rather than trusting review.
 *
 *  Checked for **both** apps since T-19. `frontend-electron` mounts the same
 *  generated routes with `buildAppRoutes("desktop")` and hand-declares the
 *  invoice builder exactly as the web app does, so it can shadow a path the
 *  same way — and it is the surface nobody is watching.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { expect, test } from "vitest";

import { flattenIa, routableNodes } from "./ia";

const REPO = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(join(REPO, path), "utf8");

const ROUTES = read("frontend-react/src/shell/routes.tsx");
const SHELL = read("frontend-react/src/shell/ProductShell.tsx");

/** One entry per app that mounts the shared routes. */
const APPS = [
  { name: "frontend-saas", surface: "saas", source: read("frontend-saas/src/App.tsx") },
  {
    name: "frontend-electron",
    surface: "desktop",
    source: read("frontend-electron/src/App.tsx"),
  },
] as const;

/** Every `path="..."` on a <Route> hand-declared in an app's own tree. */
function handDeclaredPaths(source: string): string[] {
  return [...source.matchAll(/<Route\s+path="([^"]*)"/g)].map((match) => match[1]);
}

test.each(APPS)("$name's sources are actually being read", ({ source }) => {
  // Guards against a rename making the assertions below pass vacuously.
  expect(source).toContain("buildAppRoutes(");
  expect(ROUTES).toContain("const BUILT");
  expect(handDeclaredPaths(source).length).toBeGreaterThan(0);
});

test.each(APPS)(
  "no hand-declared route in $name shadows a path the IA already owns",
  ({ surface, source }) => {
    const iaPaths = new Set(
      routableNodes(surface)
        .map((node) => node.path)
        .filter((path): path is string => path !== undefined),
    );

    // Redirects for pre-IA URLs are fine — they point AT the IA, and none of
    // them can collide because an IA path is never also a legacy path.
    const collisions = handDeclaredPaths(source).filter((path) => iaPaths.has(path));

    expect(collisions).toEqual([]);
  },
);

test("every screen in BUILT claims a real IA path", () => {
  // A typo'd key is silent in the other direction: the screen simply never
  // mounts and the node renders as scaffold, which looks intentional.
  const builtBlock = ROUTES.slice(
    ROUTES.indexOf("const BUILT"),
    ROUTES.indexOf("// ------------------------------------------------------------------- sketches"),
  );
  // Quoted keys carry slashes and route params (":clientId"); bare keys are
  // plain identifiers. Matching them together would stop at the param's colon.
  const quoted = [...builtBlock.matchAll(/^\s{2}"([^"]+)":/gm)].map((m) => m[1]);
  const bare = [...builtBlock.matchAll(/^\s{2}([a-z][a-zA-Z0-9]*):/gm)].map((m) => m[1]);
  const keys = [...quoted, ...bare];

  // "both", not "saas": BUILT is surface-agnostic — it says which screens are
  // written, and the router decides which surface may mount them.
  const iaPaths = new Set(
    routableNodes("both")
      .map((node) => node.path)
      .filter((path): path is string => path !== undefined),
  );

  expect(keys.length).toBeGreaterThan(10);
  expect(keys.filter((key) => !iaPaths.has(key))).toEqual([]);
});

// ------------------------------------------------------- nav curation (§11b)

test("a curated node redirects instead of rendering its scaffold", () => {
  // `nav: false` keeps the address alive; `mergedInto` says where it now goes.
  // If IaScreen stops honouring it, every one of those paths silently starts
  // rendering a yellow scaffold page again — which looks deliberate, because
  // a scaffold page is what unbuilt is supposed to look like. That is the same
  // failure mode as the route-shadowing bug this file was written for.
  expect(ROUTES).toContain("node.mergedInto");
  expect(ROUTES).toContain("<Navigate");
});

test("no curated node also claims a screen in BUILT", () => {
  // A screen registered against a redirected path can never render. Harmless
  // and invisible, which is exactly why it survives: it reads as wired work.
  const merged = new Set(
    flattenIa()
      .filter((node) => node.mergedInto !== undefined)
      .map((node) => node.path as string),
  );
  const builtBlock = ROUTES.slice(
    ROUTES.indexOf("const BUILT"),
    ROUTES.indexOf("// ------------------------------------------------------------------- sketches"),
  );
  const claimed = [...merged].filter((path) => builtBlock.includes(`"${path}":`));

  expect(claimed).toEqual([]);
});

test("the palette indexes hidden nodes but not parameterised paths", () => {
  // Two rules that pull in opposite directions and are both load-bearing: the
  // palette must still reach what the nav stopped offering (that is what makes
  // curating safe), and it must not offer a path it cannot fill in.
  expect(SHELL).toContain('!node.path.includes(":")');
  expect(SHELL).not.toContain("navNodes");
});

test("the shell's nav is built through the curation predicate", () => {
  // The nav filter is three characters from being written by hand, and a
  // hand-written `child.nav !== false` is a second spelling of a rule that has
  // to stay single — see isNavDestination's own comment.
  expect(SHELL).toContain("isNavDestination");
  expect(SHELL).not.toMatch(/child\.nav\s*!==\s*false/);
});
