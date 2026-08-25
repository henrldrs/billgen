/** The IA registry is the spine of nav, routes and the roadmap, so its
 *  invariants are worth enforcing rather than trusting. A duplicate path here
 *  silently shadows a route; a duplicate key breaks React reconciliation in
 *  the nav and the palette. */

import { expect, test } from "vitest";

import { IA, coverage, flattenIa, iaFor, missingEndpoints, routableNodes } from "./ia";

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
