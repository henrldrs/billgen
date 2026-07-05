import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { DashboardPanel } from "./DashboardPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders KPI cards and revenue table", async () => {
  server.use(
    http.get(`${BASE}/reports/kpi`, () =>
      HttpResponse.json({
        invoiced_total: "3025.00",
        paid_total: "1512.50",
        outstanding_total: "1512.50",
        counts: { paid: 1, overdue: 1 },
        overdue_count: 1,
      }),
    ),
    http.get(`${BASE}/reports/revenue`, () =>
      HttpResponse.json({ year: 2026, months: { "7": "3025.00" } }),
    ),
  );

  renderWithProvider(
    <DashboardPanel companyId={COMPANY_ID} year={2026} today="2026-08-15" />,
  );

  // invoiced KPI card + July revenue row
  expect(await screen.findAllByText("€3,025.00")).toHaveLength(2);
  expect(screen.getAllByText("€1,512.50")).toHaveLength(2); // paid + outstanding
  expect(screen.getByText("Overdue")).toBeInTheDocument();
  expect(screen.getByText("July")).toBeInTheDocument();
});
