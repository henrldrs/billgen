/** Top bar with a popup list per section (BGEN-BRAND-02, decided 2026-08-25).
 *
 *  The sidebar was rejected in favour of a top bar where each primary section
 *  opens a popup of its sub-pages. Two things about that are easy to break and
 *  invisible until someone clicks:
 *
 *    1. The popup must not be clipped. `.bg-topnav__links` used to carry
 *       `overflow-x: auto`, and Menu renders no portal, so every popup was cut
 *       off at the nav's edge.
 *    2. The section's own landing page must be IN the list. The trigger opens
 *       the menu instead of navigating, so without an explicit entry the
 *       section overview becomes unreachable.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { TopNav, type TopNavLink } from "@henrioutai/ui";

function navWith(links: TopNavLink[]) {
  return render(<TopNav title="ACME SRL" links={links} />);
}

test("a section with sub-pages renders a popup trigger, not a plain link", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  navWith([
    {
      key: "sales",
      label: "Sales",
      items: [
        { key: "overview", label: "Sales overview", onSelect: vi.fn() },
        { key: "invoices", label: "Invoices", onSelect },
        { key: "quotes", label: "Quotes", onSelect: vi.fn() },
      ],
    },
  ]);

  const trigger = screen.getByRole("button", { name: /Sales/ });
  expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  // Sub-pages are not in the DOM until the popup opens.
  expect(screen.queryByText("Invoices")).not.toBeInTheDocument();

  await user.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");

  await user.click(screen.getByRole("menuitem", { name: "Invoices" }));
  expect(onSelect).toHaveBeenCalledOnce();
});

test("the section's own landing page is reachable from its popup", async () => {
  const user = userEvent.setup();
  const goToOverview = vi.fn();

  navWith([
    {
      key: "catalog",
      label: "Catalog",
      items: [
        { key: "overview", label: "Catalog overview", onSelect: goToOverview },
        { key: "products", label: "Products", onSelect: vi.fn() },
      ],
    },
  ]);

  await user.click(screen.getByRole("button", { name: /Catalog/ }));
  await user.click(screen.getByRole("menuitem", { name: "Catalog overview" }));
  expect(goToOverview).toHaveBeenCalledOnce();
});

test("a section without sub-pages stays a plain navigating link", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  navWith([{ key: "dashboard", label: "Dashboard", onClick }]);

  const link = screen.getByRole("button", { name: "Dashboard" });
  expect(link).not.toHaveAttribute("aria-haspopup");

  await user.click(link);
  expect(onClick).toHaveBeenCalledOnce();
});

test("the nav row wraps instead of scrolling, so popups are not clipped", () => {
  // Regression guard for cause 1 above. A clipped popup still renders in the
  // DOM, so no query-based test can catch it, and jsdom never applies the
  // stylesheet — so the assertion is made against the CSS source itself.
  const css = readFileSync(
    resolve(__dirname, "../../../henrioutai-ui/src/styles/components.css"),
    "utf8",
  );
  // Comments are stripped first: the rule explains WHY overflow-x was removed,
  // so a naive substring check matches its own commentary.
  const declarations = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/\.bg-topnav__links \{[^}]*\}/);
  expect(declarations).not.toBeNull();
  expect(declarations?.[0]).toContain("flex-wrap: wrap");
  expect(declarations?.[0]).not.toContain("overflow-x");
});

test("sub-items can carry a trailing marker and a disabled state", async () => {
  const user = userEvent.setup();
  const blocked = vi.fn();

  navWith([
    {
      key: "sales",
      label: "Sales",
      items: [
        { key: "invoices", label: "Invoices", hint: <span>dot</span> },
        { key: "sent", label: "Sent", disabled: true, onSelect: blocked },
      ],
    },
  ]);

  await user.click(screen.getByRole("button", { name: /Sales/ }));
  const menu = within(screen.getByRole("menu"));
  expect(menu.getByText("dot")).toBeInTheDocument();

  const disabled = menu.getByRole("menuitem", { name: "Sent" });
  expect(disabled).toBeDisabled();
  await user.click(disabled);
  expect(blocked).not.toHaveBeenCalled();
});
