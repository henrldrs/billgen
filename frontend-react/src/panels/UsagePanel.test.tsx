import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, renderWithProvider } from "../test/utils";
import { UsagePanel } from "./UsagePanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function entitlements(extra: Record<string, unknown> = {}) {
  return {
    organization_id: "org-1",
    tier: "free",
    subscription_status: "active",
    features: { credit_notes: true, recurring_invoices: false, vat_report: "basic" },
    usage: [
      {
        meter: "invoices",
        used: 7,
        limit: 10,
        remaining: 3,
        period: "2026-08",
        exhausted: false,
      },
      {
        meter: "clients",
        used: 4,
        limit: null,
        remaining: null,
        period: null,
        exhausted: false,
      },
    ],
    ...extra,
  };
}

test("shows the tier and each allowance as used / limit", async () => {
  server.use(http.get(`${BASE}/entitlements`, () => HttpResponse.json(entitlements())));

  renderWithProvider(<UsagePanel />);

  expect(await screen.findByText("Free")).toBeInTheDocument();
  expect(screen.getByText("Invoices")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByText("10")).toBeInTheDocument();
  // The bar carries the meter's own name so two bars are distinguishable.
  expect(screen.getByRole("progressbar", { name: "Invoices" })).toHaveAttribute(
    "aria-valuenow",
    "70",
  );
});

test("an unlimited allowance gets no bar", async () => {
  server.use(http.get(`${BASE}/entitlements`, () => HttpResponse.json(entitlements())));

  renderWithProvider(<UsagePanel />);

  expect(await screen.findByText("Clients")).toBeInTheDocument();
  expect(screen.getByText("Unlimited")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar", { name: "Clients" })).not.toBeInTheDocument();
});

test("a spent allowance is called out rather than shown as remaining", async () => {
  server.use(
    http.get(`${BASE}/entitlements`, () =>
      HttpResponse.json(
        entitlements({
          usage: [
            {
              meter: "invoices",
              used: 10,
              limit: 10,
              remaining: 0,
              period: "2026-08",
              exhausted: true,
            },
          ],
        }),
      ),
    ),
  );

  renderWithProvider(<UsagePanel />);

  expect(await screen.findByText("Limit reached")).toBeInTheDocument();
  expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
});

test("graded and boolean features do not render alike", async () => {
  server.use(http.get(`${BASE}/entitlements`, () => HttpResponse.json(entitlements())));

  renderWithProvider(<UsagePanel />);

  // vat_report: "basic" is a grade, credit_notes: true is a flag, and
  // recurring_invoices: false is neither — three distinct labels.
  expect(await screen.findByText("Basic")).toBeInTheDocument();
  expect(screen.getByText("Included")).toBeInTheDocument();
  expect(screen.getByText("Not included")).toBeInTheDocument();
});
