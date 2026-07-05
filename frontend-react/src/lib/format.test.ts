import { formatDate, formatMoney, monthName } from "./format";

test("formatMoney english", () => {
  expect(formatMoney("1512.50", "EUR", "en")).toBe("€1,512.50");
});

test("formatMoney french uses comma decimals", () => {
  expect(formatMoney("1512.50", "EUR", "fr")).toContain("512,50");
});

test("formatMoney passes through non-numeric input", () => {
  expect(formatMoney("n/a", "EUR", "en")).toBe("n/a");
});

test("monthName localizes", () => {
  expect(monthName(7, "en")).toBe("July");
  expect(monthName(7, "fr")).toBe("juillet");
});

test("formatDate localizes", () => {
  expect(formatDate("2026-07-04", "en")).toMatch(/Jul/);
});
