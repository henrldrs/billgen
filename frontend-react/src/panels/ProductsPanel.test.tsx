import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { ProductsPanel } from "./ProductsPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function productRecord(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    organization_id: "org-1",
    company_id: COMPANY_ID,
    name,
    description: null,
    category: null,
    unit_price: "125.00",
    currency: "EUR",
    billing_type: "fixed",
    status: "active",
    pipeline_stage: null,
    default_vat_rate: "21.0",
    tags: [],
    ...extra,
  };
}

test("renders the product list with formatted prices", async () => {
  server.use(
    http.get(`${BASE}/products`, () =>
      HttpResponse.json([productRecord("p1", "Consulting hour", { category: "Consulting" })]),
    ),
  );

  renderWithProvider(<ProductsPanel companyId={COMPANY_ID} />);
  expect(await screen.findByText("Consulting hour")).toBeInTheDocument();
  expect(screen.getByText("Consulting")).toBeInTheDocument();
  expect(screen.getByText("€125.00")).toBeInTheDocument();
});

test("creates a product through the form", async () => {
  const records: unknown[] = [];
  server.use(
    http.get(`${BASE}/products`, () => HttpResponse.json(records)),
    http.post(`${BASE}/products`, async ({ request }) => {
      const body = (await request.json()) as { name: string; unit_price: string };
      expect(body.unit_price).toBe("850.00");
      const created = productRecord("p2", body.name, { unit_price: body.unit_price });
      records.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );

  renderWithProvider(<ProductsPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole("button", { name: "Add product" }));
  await user.type(screen.getByLabelText("Name"), "Audit day");
  await user.type(screen.getByLabelText("Unit price"), "850.00");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Audit day")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("the filters are query parameters, not a slice of a fetched list", async () => {
  // The distinction the panel's own comment is about: a browser-side filter
  // keeps working until the catalog outgrows one response and then quietly
  // stops finding things. So the assertion is on the REQUEST.
  const user = userEvent.setup();
  const asked: string[] = [];
  server.use(
    http.get(`${BASE}/products`, ({ request }) => {
      const url = new URL(request.url);
      asked.push(`${url.searchParams.get("status") ?? "-"}/${url.searchParams.get("billing_type") ?? "-"}`);
      return HttpResponse.json([productRecord("p-1", "Consulting day")]);
    }),
  );

  renderWithProvider(<ProductsPanel companyId={COMPANY_ID} />);
  expect(await screen.findByText("Consulting day")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Status"), "archived");
  await vi.waitFor(() => expect(asked).toContain("archived/-"));

  await user.selectOptions(screen.getByLabelText("Billing type"), "hourly");
  await vi.waitFor(() => expect(asked).toContain("archived/hourly"));
});

test("the archived view is the same screen with the filter preset", async () => {
  // Not a second list: the control is still there, so the preset is a starting
  // point and a user can leave it without changing screens.
  const asked: string[] = [];
  server.use(
    http.get(`${BASE}/products`, ({ request }) => {
      asked.push(new URL(request.url).searchParams.get("status") ?? "-");
      return HttpResponse.json([productRecord("p-2", "Retired offer", { status: "archived" })]);
    }),
  );

  renderWithProvider(<ProductsPanel companyId={COMPANY_ID} status="archived" />);

  expect(await screen.findByText("Retired offer")).toBeInTheDocument();
  expect(asked).toEqual(["archived"]);
  expect(screen.getByLabelText("Status")).toHaveValue("archived");
});
