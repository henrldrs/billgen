import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { DashboardPanel } from "./DashboardPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function reports(kpi: Record<string, unknown> = {}) {
  return [
    http.get(`${BASE}/reports/kpi`, () =>
      HttpResponse.json({
        invoiced_total: "3025.00",
        paid_total: "1512.50",
        outstanding_total: "1512.50",
        counts: { paid: 1, overdue: 1 },
        overdue_count: 1,
        ...kpi,
      }),
    ),
    http.get(`${BASE}/reports/revenue`, () =>
      HttpResponse.json({ year: 2026, months: { "7": "3025.00" } }),
    ),
    http.get(`${BASE}/reports/vat`, ({ request }) => {
      const period = new URL(request.url).searchParams.get("period");
      return HttpResponse.json({
        period,
        period_start: "2026-07-01",
        period_end: "2026-09-30",
        currency: "EUR",
        lines: [],
        invoiced_base: "2500.00",
        invoiced_vat: "525.00",
        credited_base: "0.00",
        credited_vat: "0.00",
        net_base: "2500.00",
        net_vat: "525.00",
        invoice_count: 2,
      });
    }),
    http.get(`${BASE}/activity`, () =>
      HttpResponse.json([
        {
          id: "a1",
          actor_user_id: null,
          action: "issue",
          target_type: "invoice",
          target_id: "i1",
          before: null,
          after: { reference: "ACME-2026/0007" },
          timestamp: "2026-08-14T10:02:00Z",
        },
        {
          id: "a2",
          actor_user_id: null,
          action: "create",
          target_type: "client",
          target_id: "c1",
          before: null,
          after: { name: "Van Dijk Holding BV" },
          timestamp: "2026-08-13T09:00:00Z",
        },
      ]),
    ),
  ];
}

test("renders KPI cards, the VAT buffer for the quarter, and the revenue table", async () => {
  server.use(...reports());

  renderWithProvider(
    <DashboardPanel companyId={COMPANY_ID} year={2026} today="2026-08-15" />,
  );

  // invoiced KPI card + July revenue row
  expect(await screen.findAllByText("€3,025.00")).toHaveLength(2);
  expect(screen.getAllByText("€1,512.50")).toHaveLength(2); // paid + outstanding
  expect(screen.getByText("Overdue")).toBeInTheDocument();
  expect(screen.getByText("July")).toBeInTheDocument();

  //  The fifth card is the server's own VAT figure for the quarter "today"
  //  falls in — the period grammar GET /reports/vat reads.
  expect(await screen.findByText("€525.00")).toBeInTheDocument();
  expect(screen.getByText("Output VAT this quarter (2026-Q3)")).toBeInTheDocument();
});

test("recent activity is worded as what happened to what, and quick actions navigate", async () => {
  server.use(...reports());
  const onNewInvoice = vi.fn();
  const onOpenActivity = vi.fn();

  renderWithProvider(
    <DashboardPanel
      companyId={COMPANY_ID}
      year={2026}
      today="2026-08-15"
      onNewInvoice={onNewInvoice}
      onOpenActivity={onOpenActivity}
    />,
  );

  const feed = await screen.findByText("Recent activity");
  expect(feed).toBeInTheDocument();
  expect(await screen.findByText("invoice · ACME-2026/0007")).toBeInTheDocument();
  expect(screen.getByText("client · Van Dijk Holding BV")).toBeInTheDocument();

  //  Only the actions that were supplied are offered: no client callback, no
  //  client button.
  const actions = screen.getByText("Quick actions").closest(".bg-card") as HTMLElement;
  expect(within(actions).queryByText("Add a client")).not.toBeInTheDocument();
  await userEvent.click(within(actions).getByText("New invoice"));
  expect(onNewInvoice).toHaveBeenCalledOnce();

  await userEvent.click(screen.getByRole("button", { name: "See everything" }));
  expect(onOpenActivity).toHaveBeenCalledOnce();
});

test("with no invoices at all the first card is the two actions that fix it", async () => {
  server.use(
    ...reports({
      invoiced_total: "0.00",
      paid_total: "0.00",
      outstanding_total: "0.00",
      counts: {},
      overdue_count: 0,
    }),
  );
  const onNewClient = vi.fn();

  renderWithProvider(
    <DashboardPanel companyId={COMPANY_ID} year={2026} today="2026-08-15" onNewClient={onNewClient} />,
  );

  expect(await screen.findByText("No invoices issued yet")).toBeInTheDocument();
  expect(screen.getByText("Nothing past its due date")).toBeInTheDocument();
  const welcome = screen.getByText("No invoices issued yet").closest(".bg-card") as HTMLElement;
  await userEvent.click(within(welcome).getByRole("button", { name: "Add a client" }));
  expect(onNewClient).toHaveBeenCalledOnce();
});
