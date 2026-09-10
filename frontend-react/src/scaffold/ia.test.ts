/** The IA registry is the spine of nav, routes and the roadmap, so its
 *  invariants are worth enforcing rather than trusting. A duplicate path here
 *  silently shadows a route; a duplicate key breaks React reconciliation in
 *  the nav and the palette. */

import { expect, test } from "vitest";

import {
  IA,
  MVP_SURFACE,
  coverage,
  flattenIa,
  iaFor,
  iaTrail,
  isNavDestination,
  missingEndpoints,
  navNodes,
  routableNodes,
} from "./ia";

test("every node key is unique", () => {
  const keys = flattenIa().map((node) => node.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  expect(duplicates).toEqual([]);
});

test("every route path is unique", () => {
  // The invoice status tabs deliberately share one screen, but each still owns
  // a distinct path — two nodes claiming the same path would shadow each other.
  const paths = routableNodes("both").map((node) => node.path);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  expect(duplicates).toEqual([]);
});

test("desktop-only areas never reach the SaaS router", () => {
  // Regression guard: the desktop section (offline sync, printing, auto-update)
  // needs Tauri APIs and a local filesystem. It was mounted in the web app until
  // 2026-08-25, which shipped five permanently-unreachable pages.
  const saasPaths = routableNodes("saas").map((node) => node.path);
  expect(saasPaths.filter((path) => path?.startsWith("desktop"))).toEqual([]);
});

test("the desktop surface still owns its own routes", () => {
  const desktopPaths = routableNodes("desktop").map((node) => node.path);
  expect(desktopPaths).toContain("desktop");
  expect(desktopPaths.filter((path) => path?.startsWith("desktop/")).length).toBeGreaterThan(0);
});

test("scoping a surface never invents nodes", () => {
  expect(iaFor("saas").length + 1).toBe(iaFor("both").length);
});

test("only the dashboard owns the index route", () => {
  const roots = routableNodes("both").filter((node) => node.path === "");
  expect(roots.map((node) => node.key)).toEqual(["dashboard"]);
});

test("paths are relative — never absolute or trailing-slashed", () => {
  for (const node of routableNodes("both")) {
    expect(node.path?.startsWith("/")).toBe(false);
    expect(node.path?.endsWith("/")).toBe(false);
  }
});

test("a node with no backend must say what is missing", () => {
  // Otherwise the scaffold page renders an empty ledger and the gap is a
  // shrug rather than a task.
  const silent = flattenIa()
    .filter((node) => node.status === "none")
    .filter((node) => !node.missing?.length && !node.note)
    .map((node) => node.key);
  expect(silent).toEqual([]);
});

test("a wired node cites at least one endpoint, or says why it needs none", () => {
  const unexplained = flattenIa()
    .filter((node) => node.status === "wired")
    .filter((node) => !node.endpoints?.length && !node.note)
    .map((node) => node.key);
  expect(unexplained).toEqual([]);
});

test("every section is reachable — sections own a path", () => {
  for (const section of IA) {
    expect(section.path).toBeDefined();
  }
});

test("coverage counts leaves only, and the three states account for all of them", () => {
  const stats = coverage();
  expect(stats.wired + stats.partial + stats.none).toBe(stats.total);
  expect(stats.total).toBeGreaterThan(0);
});

test("the missing-endpoint list is deduplicated and non-empty", () => {
  const missing = missingEndpoints();
  expect(new Set(missing).size).toBe(missing.length);
  expect(missing.length).toBeGreaterThan(0);
});

test("every routable node knows its way back to a section", () => {
  // Breadcrumbs are generated from this, so a node with no trail is a screen
  // with no way out except the top nav — the thing they exist to prevent.
  const orphans = routableNodes("saas")
    .filter((node) => iaTrail(node.path as string).length === 0)
    .map((node) => node.key);
  expect(orphans).toEqual([]);
});

test("a trail starts at a section and ends at the node itself", () => {
  // The tree is two levels deep by design: customers.detail is a SIBLING of
  // customers.clients, not a child of it, even though its URL nests under the
  // list's. So the trail is the section and the node — "Clients > Client 360" —
  // and never repeats a label the way a URL-derived trail would.
  const trail = iaTrail("customers/clients/:clientId");
  expect(trail.map((node) => node.key)).toEqual(["customers", "customers.detail"]);
  expect(trail.map((node) => node.label)).toEqual(["Clients", "Client 360"]);
});

test("an unknown path has no trail rather than throwing", () => {
  // The invoice builder is an action, not a destination — no IA node, no trail.
  expect(iaTrail("sales/invoices/new")).toEqual([]);
});

// ------------------------------------------------------- nav curation (§11b)

test("a merged node points at a path that exists and is itself a destination", () => {
  // The failure this catches is a slow one: curate a node into its parent,
  // then later curate the PARENT into something else, and the first node
  // redirects to a page that now redirects — or to nothing at all. Both are
  // invisible until someone follows an old link.
  const paths = new Set(routableNodes("both").map((node) => node.path));
  const navPaths = new Set(navNodes("both").map((node) => node.path));

  for (const node of flattenIa().filter((n) => n.mergedInto !== undefined)) {
    expect(paths.has(node.mergedInto as string), `${node.key} -> ${node.mergedInto}`).toBe(true);
    expect(navPaths.has(node.mergedInto as string), `${node.key} -> ${node.mergedInto}`).toBe(true);
  }
});

test("a node curated out of the nav keeps its route", () => {
  // The whole mechanism rests on this: `nav: false` hides a door, it does not
  // delete an address. Deleting the node instead would also delete it from the
  // coverage count, which is how a gap disappears by being tidied away.
  const routable = new Set(routableNodes("both").map((node) => node.path));
  const hidden = flattenIa().filter((node) => node.nav === false);

  expect(hidden.length).toBeGreaterThan(0);
  for (const node of hidden) {
    expect(routable.has(node.path as string), node.key).toBe(true);
  }
});

test("the company section is one destination over one row", () => {
  // Nine nodes, one PATCH. If a future node under company arrives with a nav
  // entry of its own, this fails and asks whether it is really a place you go
  // before you know which record you want — for a single-record section the
  // answer is always no.
  const company = IA.find((section) => section.key === "company");
  expect(company?.children.filter((child) => child.nav !== false)).toEqual([]);
});

test("curating the nav never changes the coverage count", () => {
  // The ledger and the navigation are different questions (§11b constraint 2).
  // coverage() reads the whole tree, so hiding a node must not move a number
  // the architecture report prints.
  const leaves = flattenIa().filter((node) => !node.children?.length);
  expect(coverage().total).toBe(leaves.length);
  expect(leaves.some((node) => node.nav === false)).toBe(true);
});

test("no nav destination has a route parameter in its path", () => {
  // A menu entry for `customers/clients/:clientId` navigates to that literal
  // string. It was one until 2026-08-27, and nobody noticed, because the record
  // is reached by clicking a row — which is the rule this whole section is
  // about, arriving as a bug before it arrived as a principle.
  const parameterised = navNodes("both")
    .filter((node) => node.path?.includes(":"))
    .map((node) => node.key);
  expect(parameterised).toEqual([]);
});

// ------------------------------------------------------- exposure (2026-09-10)

test("a wired build offers no screen without a backend behind it", () => {
  //  The regression this exists for: T-19 gave the desktop the whole IA, so a
  //  beta tester's build grew 49 scaffold pages overnight. Sections keep their
  //  own landing page — that is navigation and needs no server — but nothing
  //  else may be `partial` or `none`.
  for (const surface of ["saas", "desktop"] as const) {
    const sectionPaths = new Set(
      iaFor(surface, "wired").map((section) => section.path),
    );
    const offered = routableNodes(surface, "wired").filter(
      (node) => !sectionPaths.has(node.path),
    );

    expect(offered.length).toBeGreaterThan(0); // or this passes by finding nothing
    expect(offered.filter((node) => node.status !== "wired")).toEqual([]);
  }
});

test("a wired build keeps a section whose own status is worse than its children", () => {
  //  `customers` is `partial` because Client groups has no backend. Filtering
  //  sections by their own status would drop a fully wired Clients screen with
  //  it — and Clients is the second thing anyone opens.
  const sections = iaFor("desktop", "wired");
  const customers = sections.find((section) => section.key === "customers");

  expect(customers).toBeDefined();
  expect(customers?.status).toBe("partial");
  expect(customers?.children.map((child) => child.key)).toContain("customers.clients");
});

test("a wired build offers no empty section", () => {
  //  A section whose every child is unbuilt is a door onto a list of nothing.
  for (const section of iaFor("desktop", "wired")) {
    expect(section.children.length).toBeGreaterThan(0);
  }
});

test("exposure never changes the ledger", () => {
  //  coverage() and the architecture report must keep seeing the whole tree
  //  whatever a build offers (ROADMAP_IA §11b, constraint 2).
  const full = coverage();
  routableNodes("desktop", "wired");
  iaFor("saas", "wired");
  expect(coverage()).toEqual(full);
  expect(flattenIa().length).toBeGreaterThan(routableNodes("desktop", "wired").length);
});

test("the template studio survives a wired build", () => {
  //  It is the beta partner's whole gift (T-32), and it is `wired`, so an
  //  exposure rule that hid it would be wrong in the one case that matters.
  const catalog = iaFor("desktop", "wired").find((s) => s.key === "catalog");
  const templates = catalog?.children.filter(isNavDestination) ?? [];

  expect(templates.map((child) => child.path)).toContain("catalog/templates");
});

// ------------------------------------------------- the MVP surface (T-19/§MVP)

test("every path in MVP_SURFACE is a path the IA has", () => {
  //  A typo here is a silent narrowing: the screen simply never mounts, and a
  //  missing door looks like a deliberate scope decision.
  const known = new Set(
    flattenIa()
      .map((node) => node.path)
      .filter((path): path is string => path !== undefined),
  );

  expect(MVP_SURFACE.length).toBeGreaterThan(10);
  expect(MVP_SURFACE.filter((path) => !known.has(path))).toEqual([]);
});

test("nothing in MVP_SURFACE is a screen with no backend at all", () => {
  //  `partial` is allowed and used on purpose — the two record screens are
  //  partial only because email delivery does not exist. `none` is not: that
  //  would put a scaffold page in front of a paying customer, which is the
  //  whole thing the exposure rule prevents.
  const byPath = new Map(flattenIa().map((node) => [node.path, node]));
  const unbacked = MVP_SURFACE.filter((path) => byPath.get(path)?.status === "none");

  expect(unbacked).toEqual([]);
});

test("the record screens are reachable on the MVP surface", () => {
  //  The regression this pins: both are `partial`, so `"wired"` alone dropped
  //  them, and every row in the invoice and client lists lost its destination.
  const routable = new Set(routableNodes("desktop", "mvp").map((node) => node.path));

  expect(routable.has("sales/invoices/id/:invoiceId")).toBe(true);
  expect(routable.has("customers/clients/:clientId")).toBe(true);
});

test("the MVP surface holds §MVP's line on what is out", () => {
  const routable = new Set(routableNodes("desktop", "mvp").map((node) => node.path));

  //  Wired, and excluded by §MVP as confirmed on 2026-09-10.
  expect(routable.has("sales/credit-notes")).toBe(false);
  expect(routable.has("reports/revenue")).toBe(false);
  //  And the three record types plus issue are all present, or it is not an
  //  invoicing product.
  for (const path of [
    "sales/invoices",
    "customers/clients",
    "catalog/products",
    "catalog/templates",
  ]) {
    expect(routable.has(path)).toBe(true);
  }
});

test("the MVP surface still has a landing page", () => {
  //  The dashboard's six wired panels are pathless, so the list governs
  //  destinations and they ride with the section. Without that rule the
  //  section dies and the app opens on nothing.
  const routable = new Set(routableNodes("desktop", "mvp").map((node) => node.path));
  expect(routable.has("")).toBe(true);
});
