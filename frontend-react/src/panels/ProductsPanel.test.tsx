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
