import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { VatReportPanel } from "./VatReportPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function report(extra: Record<string, unknown> = {}) {
  return {
    period: "2026-Q3",
    period_start: "2026-07-01",
    period_end: "2026-09-30",
    currency: "EUR",
    lines: [
      {
        category: "S",
        rate: "21.00",
        invoiced_base: "1000.00",
        invoiced_vat: "210.00",
        credited_base: "0.00",
        credited_vat: "0.00",
        net_base: "1000.00",
        net_vat: "210.00",
        grid: "03",
      },
      {
        category: "AE",
        rate: "0.00",
        invoiced_base: "500.00",
        invoiced_vat: "0.00",
        credited_base: "0.00",
        credited_vat: "0.00",
        net_base: "500.00",
        net_vat: "0.00",
        grid: null,
      },
    ],
    invoiced_base: "1500.00",
    invoiced_vat: "210.00",
    credited_base: "0.00",
    credited_vat: "0.00",
    net_base: "1500.00",
    net_vat: "210.00",
    invoice_count: 4,
    credit_note_count: 0,
    skipped_other_currency: 0,
    covers: "output_vat_only",
    ...extra,
  };
}

function entitlements(vatReport: string) {
  return http.get(`${BASE}/entitlements`, () =>
    HttpResponse.json({
      organization_id: "org-1",
      tier: "free",
      subscription_status: "none",
      features: { vat_report: vatReport },
      usage: [],
    }),
  );
}

test("renders the server's totals and the per-rate breakdown", async () => {
  server.use(
    http.get(`${BASE}/reports/vat`, () => HttpResponse.json(report())),
    entitlements("full"),
  );

  renderWithProvider(<VatReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText("2026-Q3")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  // A line whose Belgian grid is undecidable from sales data says so.
  expect(screen.getByText("03")).toBeInTheDocument();
  expect(screen.getByText("No unambiguous grid")).toBeInTheDocument();
});

test("always says it is sales only", async () => {
  server.use(
    http.get(`${BASE}/reports/vat`, () => HttpResponse.json(report())),
    entitlements("full"),
  );

  renderWithProvider(<VatReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText("Sales only — output VAT")).toBeInTheDocument();
  expect(screen.getByText(/not a return you can file/)).toBeInTheDocument();
});

test("dropped foreign-currency documents are declared, not hidden", async () => {
  server.use(
    http.get(`${BASE}/reports/vat`, () =>
      HttpResponse.json(report({ skipped_other_currency: 3 })),
    ),
    entitlements("full"),
  );

  renderWithProvider(<VatReportPanel companyId={COMPANY_ID} />);

  expect(
    await screen.findByText("Documents in another currency were left out"),
  ).toBeInTheDocument();
  expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
});

test("the breakdown is hidden at the basic grade, the totals are not", async () => {
  server.use(
    http.get(`${BASE}/reports/vat`, () => HttpResponse.json(report())),
    entitlements("basic"),
  );

  renderWithProvider(<VatReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText(/part of a paid plan/)).toBeInTheDocument();
  // The period totals still render: what is gated is the detail, not the report.
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.queryByText("03")).not.toBeInTheDocument();
});

test("the period picker asks the server for the period it shows", async () => {
  const asked: string[] = [];
  server.use(
    http.get(`${BASE}/reports/vat`, ({ request }) => {
      asked.push(new URL(request.url).searchParams.get("period") ?? "");
      return HttpResponse.json(report());
    }),
    entitlements("full"),
  );

  renderWithProvider(<VatReportPanel companyId={COMPANY_ID} period="2026-03" />);

  expect(await screen.findByText("2026-Q3")).toBeInTheDocument();
  // Seeded as a month, so the request must be a month — not the quarter the
  // control defaults to.
  expect(asked).toEqual(["2026-03"]);
});
