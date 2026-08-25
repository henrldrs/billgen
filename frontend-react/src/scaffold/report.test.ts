/** Not an assertion suite — this prints the coverage tables that go into
 *  docs/ROADMAP_IA.md, so the document can be regenerated from the registry
 *  rather than hand-maintained and drifting.
 *
 *  Run: npx vitest run --root frontend-react src/scaffold/report.test.ts
 */

import { test } from "vitest";

import { IA, coverage, flattenIa, missingEndpoints } from "./ia";
import type { Layer } from "./ia";

test("coverage report", () => {
  const overall = coverage();
  const lines: string[] = [];

  lines.push("\n=== OVERALL (leaf nodes) ===");
  lines.push(
    `total ${overall.total} · wired ${overall.wired} · partial ${overall.partial} · none ${overall.none} · ${overall.percent}% fully wired`,
  );

  lines.push("\n=== BY SECTION ===");
  lines.push("| Section | Wired | Partial | None | Total |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const section of IA) {
    const s = coverage([section]);
    lines.push(
      `| ${section.label} | ${s.wired} | ${s.partial} | ${s.none} | ${s.total} |`,
    );
  }

  lines.push("\n=== BY LAYER ===");
  lines.push("| Layer | Wired | Partial | None | Total |");
  lines.push("|---|---:|---:|---:|---:|");
  const layers: Layer[] = ["L1", "L2", "L3", "L4", "L5", "L6"];
  const leaves = flattenIa().filter((node) => !node.children?.length);
  for (const layer of layers) {
    const inLayer = leaves.filter((node) => node.layer === layer);
    lines.push(
      `| ${layer} | ${inLayer.filter((n) => n.status === "wired").length} | ${inLayer.filter((n) => n.status === "partial").length} | ${inLayer.filter((n) => n.status === "none").length} | ${inLayer.length} |`,
    );
  }

  const missing = missingEndpoints();
  lines.push(`\n=== MISSING BACKEND CAPABILITIES (${missing.length}) ===`);
  for (const item of missing) lines.push(`- ${item}`);

  // eslint-disable-next-line no-console -- this test exists to print
  console.log(lines.join("\n"));
});
