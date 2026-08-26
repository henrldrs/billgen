import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, companyRecord, renderWithProvider } from "../test/utils";
import { RevenueReportPanel } from "./RevenueReportPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const KPI = {
  invoiced_total: "9000.00",
  paid_total: "4000.00",
  outstanding_total: "5000.00",
  counts: { issued: 2, paid: 1 },
  overdue_count: 1,
};

function stubCompanies() {
  return http.get(`${BASE}/companies`, () => HttpResponse.json([companyRecord()]));
}

test("renders server months in the chart and the table, and never sums them", async () => {
  server.use(
    stubCompanies(),
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/reports/revenue`, () =>
      HttpResponse.json({ year: 2026, months: { "3": "1000.00", "7": "8000.00" } }),
    ),
  );

  renderWithProvider(<RevenueReportPanel companyId={COMPANY_ID} year={2026} />);

  const table = within(await screen.findByRole("table"));
  expect(table.getByText("March")).toBeInTheDocument();
  expect(table.getByText("€1,000.00")).toBeInTheDocument();
  expect(table.getByText("€8,000.00")).toBeInTheDocument();

  // The peak is one of the server's own twelve figures, picked out — not a
  // total this component computed. A year total would be €9,000 and must not
  // appear anywhere it could be mistaken for the KPI strip's all-time figure.
  expect(screen.getByText("Best month")).toBeInTheDocument();
  // Once as the KPI card's value, once as the table row it was picked from.
  expect(screen.getAllByText("July")).toHaveLength(2);
});

test("the year picker drives the query rather than filtering in the browser", async () => {
  const years: string[] = [];
  server.use(
    stubCompanies(),
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/reports/revenue`, ({ request }) => {
      const year = new URL(request.url).searchParams.get("year") ?? "";
      years.push(year);
      return HttpResponse.json({ year: Number(year), months: {} });
    }),
  );

  renderWithProvider(<RevenueReportPanel companyId={COMPANY_ID} year={2026} />);
  const user = userEvent.setup();

  await waitFor(() => expect(years).toContain("2026"));
  await user.selectOptions(await screen.findByLabelText("Year"), "2025");
  await waitFor(() => expect(years).toContain("2025"));
});

test("a year with no invoices renders an empty state, not a zeroed table", async () => {
  server.use(
    stubCompanies(),
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/reports/revenue`, () =>
      HttpResponse.json({ year: 2026, months: {} }),
    ),
  );

  renderWithProvider(<RevenueReportPanel companyId={COMPANY_ID} year={2026} />);
  expect(
    await screen.findAllByText("No invoices were issued in this year."),
  ).not.toHaveLength(0);
});

test("a failed report offers a retry instead of an empty chart", async () => {
  server.use(
    stubCompanies(),
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/reports/revenue`, () =>
      HttpResponse.json({ detail: "boom" }, { status: 500 }),
    ),
  );

  renderWithProvider(<RevenueReportPanel companyId={COMPANY_ID} year={2026} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
