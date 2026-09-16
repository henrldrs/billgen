/** The navigation speaks the interface language (T-46).
 *
 *  With NL selected the headings said "Facturen" while the nav, the
 *  breadcrumbs and the status tabs stayed English, because `ia.ts` carried
 *  string literals no translation table could see. For a compliance product a
 *  half-translated screen is a credibility defect, so this mounts the real
 *  shell under `nl` and looks for the English words. */

import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test } from "vitest";

import { LanguageProvider } from "../providers/LanguageProvider";
import {
  BASE,
  COMPANY_ID,
  companyRecord,
  invoiceRecord,
  isoDaysFromToday,
  renderWithProvider,
} from "../test/utils";
import { markTourDone } from "../lib/tour";
import { ProductShell } from "./ProductShell";
import { buildAppRoutes } from "./routes";

const server = setupServer(
  http.get(`${BASE}/companies`, () => HttpResponse.json([companyRecord()])),
  http.get(`${BASE}/clients`, () => HttpResponse.json([])),
  http.get(`${BASE}/invoices`, () =>
    HttpResponse.json([
      invoiceRecord("inv-1", "ACME-BC07012026", { status: "issued", due_date: isoDaysFromToday(30) }),
      invoiceRecord("inv-2", "ACME-BC07022026", { status: "partially_paid", due_date: isoDaysFromToday(30) }),
    ]),
  ),
  http.get(`${BASE}/alerts`, () =>
    HttpResponse.json({
      company_id: COMPANY_ID,
      as_of: "2026-09-16",
      alerts: [],
      counts_by_severity: {},
      counts_by_code: {},
      truncated: false,
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function mountInvoices(lang: string) {
  localStorage.setItem("billgen.lang", lang);
  markTourDone();
  return renderWithProvider(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/app/sales/invoices"]}>
        <Routes>
          <Route path="/app" element={<ProductShell surface="desktop" exposure="mvp" />}>
            {buildAppRoutes("desktop", "mvp")}
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

const ENGLISH_NAV = ["Sales", "Clients", "Catalog", "Reports", "Invoices"];
const ENGLISH_TABS = ["Drafts", "Issued", "Paid", "Partially paid", "Overdue", "Cancelled", "Sent", "Viewed"];

test("under nl the nav, the tabs, the crumbs and the badges carry no English", async () => {
  mountInvoices("nl");

  const nav = await screen.findByRole("navigation", { name: "Primary" });
  await waitFor(() => expect(within(nav).getByText("Verkoop")).toBeInTheDocument());
  expect(within(nav).getByText("Klanten")).toBeInTheDocument();
  for (const word of ENGLISH_NAV) {
    expect(within(nav).queryByText(word)).not.toBeInTheDocument();
  }

  const tabs = screen.getByRole("tablist");
  expect(within(tabs).getByRole("tab", { name: "Concepten" })).toBeInTheDocument();
  expect(within(tabs).getByRole("tab", { name: "Deels betaald" })).toBeInTheDocument();
  for (const word of ENGLISH_TABS) {
    expect(within(tabs).queryByRole("tab", { name: word })).not.toBeInTheDocument();
  }

  // The badges read the same table, so an issued invoice is "Uitgegeven".
  const table = await screen.findByRole("table", { name: "Facturen" });
  expect(await within(table).findByText("Uitgegeven")).toBeInTheDocument();
  expect(within(table).getByText("Deels betaald")).toBeInTheDocument();
  expect(within(table).queryByText("Issued")).not.toBeInTheDocument();
});

test("under en the same screen reads as it always did", async () => {
  mountInvoices("en");
  const nav = await screen.findByRole("navigation", { name: "Primary" });
  await waitFor(() => expect(within(nav).getByText("Sales")).toBeInTheDocument());
  const tabs = screen.getByRole("tablist");
  expect(within(tabs).getByRole("tab", { name: "Partially paid" })).toBeInTheDocument();
  const table = await screen.findByRole("table", { name: "Invoices" });
  expect(await within(table).findByText("Issued")).toBeInTheDocument();
});
