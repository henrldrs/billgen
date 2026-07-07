import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { InvoiceBuilderPanel } from "./InvoiceBuilderPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const CLIENT = {
  id: "c-1",
  organization_id: "org-1",
  company_id: COMPANY_ID,
  name: "Big Corp",
  contact_person: null,
  email: null,
  phone: null,
  vat_number: null,
  address_line1: null,
  postal_code: null,
  city: null,
  country_code: "BE",
  is_business: true,
  notes: null,
};

function mockEndpoints() {
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "1250.00",
        total_discount: "0.00",
        net_ht: "1250.00",
        total_vat: "262.50",
        total_ttc: "1512.50",
        vat_breakdown: { "21": "262.50" },
      }),
    ),
    http.post(`${BASE}/invoices`, async ({ request }) => {
      const body = (await request.json()) as {
        client_id: string;
        lines: { unit_price: string }[];
      };
      expect(body.client_id).toBe("c-1");
      expect(body.lines[0].unit_price).toBe("125.00");
      // POST /invoices now creates a DRAFT: no number yet.
      return HttpResponse.json(
        invoiceRecord("inv-1", null, { status: "draft", sequence_global: null }),
        { status: 201 },
      );
    }),
  );
}

test("shows live totals from the preview endpoint and creates the invoice", async () => {
  mockEndpoints();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");
  await user.type(screen.getByLabelText("Description 1"), "Consulting — July");
  await user.clear(screen.getByLabelText("Qty 1"));
  await user.type(screen.getByLabelText("Qty 1"), "10");
  await user.type(screen.getByLabelText("Unit price 1"), "125.00");

  // totals arrive from the API preview — not computed in the browser
  expect(await screen.findByText("€1,512.50")).toBeInTheDocument();
  expect(screen.getByText("€262.50")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Draft saved");
});

test("create is disabled until a client is picked and lines are valid", async () => {
  mockEndpoints();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const createButton = await screen.findByRole("button", { name: "Save draft" });
  expect(createButton).toBeDisabled();

  await user.type(screen.getByLabelText("Description 1"), "Something");
  await user.type(screen.getByLabelText("Unit price 1"), "10");
  expect(createButton).toBeDisabled(); // still no client

  await user.selectOptions(screen.getByLabelText("Client"), "c-1");
  expect(createButton).toBeEnabled();
});

test("lines can be added and removed", async () => {
  mockEndpoints();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole("button", { name: "Add line" }));
  expect(screen.getByLabelText("Description 2")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
  expect(screen.queryByLabelText("Description 2")).not.toBeInTheDocument();
});
