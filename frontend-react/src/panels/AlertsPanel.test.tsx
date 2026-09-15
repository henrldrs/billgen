/** The alerts card holds no rules: it renders what the server decided, in
 *  the interface language, and sends each row to the screen that fixes it. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, test, vi } from "vitest";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { AlertsPanel } from "./AlertsPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const ALERTS = [
  {
    code: "invoice.overdue",
    severity: "critical",
    target_type: "invoice",
    target_id: "i-1",
    title: "ACME-2026/0007",
    context: { days_overdue: 45, outstanding: "1512.50", currency: "EUR", client_id: "c-1" },
  },
  {
    code: "company.incomplete",
    severity: "critical",
    target_type: "company",
    target_id: COMPANY_ID,
    title: "Acme Consulting",
    context: { invalid_fields: ["vat_number"], missing_for_peppol: ["iban"] },
  },
  {
    code: "client.missing_vat_number",
    severity: "warning",
    target_type: "client",
    target_id: "c-2",
    title: "Van Dijk Holding BV",
    context: { country_code: "NL" },
  },
  {
    code: "invoice.draft_stale",
    severity: "info",
    target_type: "invoice",
    target_id: "i-2",
    title: "2026-07-01",
    context: { days: 76, amount: "250.00" },
  },
];

function alerts(overrides: Record<string, unknown> = {}) {
  return http.get(`${BASE}/alerts`, ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get("company_id")).toBe(COMPANY_ID);
    return HttpResponse.json({
      company_id: COMPANY_ID,
      as_of: "2026-09-15",
      alerts: ALERTS,
      counts_by_severity: { critical: 2, warning: 1, info: 1 },
      counts_by_code: {},
      truncated: false,
      ...overrides,
    });
  });
}

test("each code becomes a sentence with its numbers, worst first, and the action opens the target", async () => {
  server.use(alerts());
  const onOpen = vi.fn();

  renderWithProvider(<AlertsPanel companyId={COMPANY_ID} today="2026-09-15" onOpen={onOpen} />);

  expect(await screen.findByText("Overdue by 45 days — €1,512.50 still open")).toBeInTheDocument();
  expect(screen.getByText("Company identifiers to fix: vat_number · Missing for Peppol: iban")).toBeInTheDocument();
  expect(screen.getByText(/Business client without a VAT number/)).toBeInTheDocument();
  expect(screen.getByText("Draft untouched for 76 days — €250.00")).toBeInTheDocument();

  //  The header counts are the server's, one badge per severity that fired.
  const header = screen.getByText("What needs attention").closest(".bg-card__header") as HTMLElement;
  expect(within(header).getByText("2 critical")).toBeInTheDocument();
  expect(within(header).getByText("1 warning")).toBeInTheDocument();
  expect(within(header).getByText("1 note")).toBeInTheDocument();

  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("ACME-2026/0007");
  await userEvent.click(within(rows[0]).getByRole("button", { name: "Open invoice" }));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ target_type: "invoice", target_id: "i-1" }));
  await userEvent.click(within(rows[1]).getByRole("button", { name: "Fix company" }));
  await userEvent.click(within(rows[2]).getByRole("button", { name: "Open client" }));
  expect(onOpen).toHaveBeenCalledTimes(3);
});

test("a capped list says how many it is not showing", async () => {
  server.use(alerts({ counts_by_severity: { critical: 5, warning: 3, info: 2 }, truncated: true }));
  renderWithProvider(<AlertsPanel companyId={COMPANY_ID} today="2026-09-15" />);
  expect(await screen.findByText("6 more not shown — the lists have them all.")).toBeInTheDocument();
});

test("nothing to do says so, calmly", async () => {
  server.use(alerts({ alerts: [], counts_by_severity: {} }));
  renderWithProvider(<AlertsPanel companyId={COMPANY_ID} today="2026-09-15" />);
  expect(await screen.findByText("Nothing needs attention today.")).toBeInTheDocument();
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("a code the UI does not know still shows its title and the code", async () => {
  server.use(
    alerts({
      alerts: [{ code: "invoice.something_new", severity: "warning", target_type: "invoice", target_id: "i-9", title: "ACME-2026/0009", context: {} }],
      counts_by_severity: { warning: 1 },
    }),
  );
  renderWithProvider(<AlertsPanel companyId={COMPANY_ID} lang="fr" today="2026-09-15" />);
  expect(await screen.findByText("ACME-2026/0009")).toBeInTheDocument();
  expect(screen.getByText("invoice.something_new")).toBeInTheDocument();
  expect(screen.getByText("À traiter")).toBeInTheDocument();
});
