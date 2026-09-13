/** The tour points at the real shell. Every selector in `tourSteps.ts` has
 *  to match an element the shell renders on the dashboard of a handed-over
 *  build — otherwise a step is a card in the middle of the screen describing
 *  something it cannot show, and nobody notices until a beta tester does.
 *
 *  Also the two ways the tour opens: by itself, once, after the first run
 *  set the flag; and from the account menu, any time. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test } from "vitest";

import { LanguageProvider } from "../providers/LanguageProvider";
import { BASE, companyRecord, renderWithProvider } from "../test/utils";
import { markTourDone, requestTour } from "../lib/tour";
import { ProductShell } from "./ProductShell";
import { buildAppRoutes } from "./routes";
import { TOUR_ANCHORS, tourSteps } from "./tourSteps";

const server = setupServer(
  http.get(`${BASE}/companies`, () => HttpResponse.json([companyRecord()])),
  http.get(`${BASE}/reports/kpi`, () =>
    HttpResponse.json({
      invoiced_total: "0.00",
      paid_total: "0.00",
      outstanding_total: "0.00",
      counts: {},
      overdue_count: 0,
    }),
  ),
  http.get(`${BASE}/reports/revenue`, () => HttpResponse.json({ year: 2026, months: {} })),
  http.get(`${BASE}/reports/vat`, () =>
    HttpResponse.json({
      period: "2026-Q3",
      period_start: "2026-07-01",
      period_end: "2026-09-30",
      currency: "EUR",
      lines: [],
      invoiced_base: "0",
      invoiced_vat: "0",
      credited_base: "0",
      credited_vat: "0",
      net_base: "0",
      net_vat: "0",
      invoice_count: 0,
    }),
  ),
  http.get(`${BASE}/activity`, () => HttpResponse.json([])),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function mountShell() {
  return renderWithProvider(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/app" element={<ProductShell surface="desktop" exposure="mvp" />}>
            {buildAppRoutes("desktop", "mvp")}
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

test("every tour anchor matches an element on a handed-over build's dashboard", async () => {
  markTourDone();
  mountShell();
  //  The dashboard's KPI grid is the last anchor to appear: it waits on the
  //  reports. Once it is there, the shell around it is too.
  await waitFor(() => expect(document.querySelector(TOUR_ANCHORS.numbers)).not.toBeNull());

  for (const step of tourSteps("en")) {
    expect(document.querySelector(step.anchor as string), step.key).not.toBeNull();
  }
});

test("a pending tour opens by itself, once, and 'Take the tour' replays it", async () => {
  requestTour();
  mountShell();

  const dialog = await screen.findByRole("dialog", { name: "Guided tour" });
  expect(dialog).toHaveTextContent("Everything is in the top bar");
  await userEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(screen.queryByRole("dialog", { name: "Guided tour" })).not.toBeInTheDocument();
  expect(localStorage.getItem("billgen.tour")).toBe("done");

  await userEvent.click(screen.getByRole("button", { name: "Account" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Take the tour" }));
  expect(await screen.findByRole("dialog", { name: "Guided tour" })).toHaveTextContent("Step 1 of 6");
});

test("with no flag the shell opens quietly", async () => {
  mountShell();
  await waitFor(() => expect(document.querySelector(TOUR_ANCHORS.numbers)).not.toBeNull());
  expect(screen.queryByRole("dialog", { name: "Guided tour" })).not.toBeInTheDocument();
});
