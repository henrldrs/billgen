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

import { IA, isNavDestination } from "../scaffold/ia";

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

test("a section curated down to one destination offers no sub-page popup", async () => {
  // Built the way AppShell builds it, from the real IA, because the bug this
  // guards against lives in that construction and not in TopNav: forget the
  // isNavDestination filter and Company is back to nine doors onto one row
  // (ROADMAP_IA §11b). Reading the IA here also means a new company node with
  // a nav entry of its own fails this test on the day it is added.
  const user = userEvent.setup();
  const company = IA.find((section) => section.key === "company");
  const subPages = (company?.children ?? []).filter(isNavDestination);

  expect(subPages).toEqual([]);

  navWith([
    {
      key: "company",
      label: "Company",
      ...(subPages.length > 0
        ? {
            items: subPages.map((child) => ({
              key: child.key,
              label: child.label,
              onSelect: vi.fn(),
            })),
          }
        : { onClick: vi.fn() }),
    },
  ]);

  const trigger = screen.getByRole("button", { name: "Company" });
  expect(trigger).not.toHaveAttribute("aria-haspopup");

  await user.click(trigger);
  expect(screen.queryByText("VAT / BCE information")).not.toBeInTheDocument();
});

test("Escape closes a popup from its focused trigger, not only from inside it", async () => {
  // T-47. Opening moves focus into the popup, so Escape there always worked;
  // Shift+Tab back to the trigger with the popup still open — or a first item
  // that is disabled — left focus on a trigger that ignored it.
  const user = userEvent.setup();
  navWith([
    {
      key: "sales",
      label: "Sales",
      items: [{ key: "invoices", label: "Invoices", onSelect: vi.fn() }],
    },
  ]);

  const trigger = screen.getByRole("button", { name: /Sales/ });
  await user.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");

  await user.tab({ shift: true });
  expect(trigger).toHaveFocus();
  expect(screen.getByRole("menu")).toBeInTheDocument();

  await user.keyboard("{Escape}");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
