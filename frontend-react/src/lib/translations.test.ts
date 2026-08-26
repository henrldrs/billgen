import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { t } from "./translations";

test("returns the requested language", () => {
  expect(t("fr", "clients.title")).toBe("Clients");
  expect(t("nl", "clients.add")).toBe("Klant toevoegen");
  expect(t("es", "common.save")).toBe("Guardar");
});

test("english is the reference language", () => {
  expect(t("en", "clients.empty")).toContain("first client");
});

test("an unknown key degrades to the key, it does not throw", () => {
  // A throw here propagates out of render and blanks the whole route. One call
  // site builds its key at runtime (HistoryPanel's `history.${action.kind}`,
  // behind a cast), so "unreachable" is not a guarantee the types can make.
  expect(t("fr", "does.not.exist" as never)).toBe("does.not.exist");
});

test("every key a screen asks for actually exists", () => {
  // TypeScript covers literal call sites one file at a time; this covers the
  // whole tree at once, so a key dropped during a rename fails the build rather
  // than whoever opens that screen next.
  const REPO = resolve(__dirname, "../../..");
  const SOURCE = readFileSync(join(REPO, "frontend-react/src/lib/translations.ts"), "utf8");

  const defined = new Set(
    [...SOURCE.matchAll(/^ {2}"([a-zA-Z0-9._]+)":\s*\{/gm)].map((match) => match[1]),
  );
  expect(defined.size).toBeGreaterThan(100);

  const walk = (dir: string): string[] => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return []; // a frontend that does not exist yet is not a failure
    }
    return entries.flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
    });
  };

  const used = new Set<string>();
  const CALL = /\bt\(\s*[A-Za-z_"']+\s*,\s*"([^"]+)"/g;
  for (const root of ["frontend-react/src", "frontend-saas/src", "frontend-electron/src"]) {
    for (const file of walk(join(REPO, root))) {
      for (const match of readFileSync(file, "utf8").matchAll(CALL)) {
        used.add(match[1]);
      }
    }
  }

  expect(used.size).toBeGreaterThan(50);
  expect([...used].filter((key) => !defined.has(key)).sort()).toEqual([]);
});
