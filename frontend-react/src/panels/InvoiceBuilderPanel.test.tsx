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

const VAT_RATES = {
  country_code: "BE",
  rates: [
    { rate: "0", label: "0%", is_default: false },
    { rate: "6", label: "6%", is_default: false },
    { rate: "12", label: "12%", is_default: false },
    { rate: "21", label: "21%", is_default: true },
  ],
  categories: [],
};

const PRODUCT = {
  id: "p-1",
  organization_id: "org-1",
  company_id: COMPANY_ID,
  name: "Audit day",
  description: "One day of audit work",
  category: "Consulting",
  // Serialised the way the API actually serialises them, not tidied: the column
  // holds six decimals and the rate comes back as "6.00" while /vat-rates says
  // "6". Both spellings caused a visible defect that every passing test missed
  // — a price of "450.000000" in an editable field, and a duplicate "6.00%"
  // option sitting beside the identical served "6%".
  unit_price: "450.000000",
  currency: "EUR",
  billing_type: "daily",
  status: "active",
  pipeline_stage: null,
  default_vat_rate: "6.00",
  tags: [],
};

const STANDARD_TREATMENT = {
  category: "S",
  category_name: "STANDARD",
  rate: "21",
  legal_mention: null,
  reason: "vat.reason.standard",
  seller_country: "BE",
  buyer_country: "BE",
};

/** A Dutch business with a VAT number: the case core/rules/vat.pick_category
 *  exists for, and the one that shipped as plain 21% Belgian VAT until
 *  GET /vat-treatment had a caller. */
const REVERSE_CHARGE_TREATMENT = {
  category: "AE",
  category_name: "REVERSE_CHARGE",
  rate: "0",
  legal_mention: "Autoliquidation — article 51 §2 du Code de la TVA",
  reason: "vat.reason.intra_eu_b2b",
  seller_country: "BE",
  buyer_country: "NL",
};

function mockEndpoints() {
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(STANDARD_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
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

test("the VAT rates are the server's four, not a copy of them in TypeScript", async () => {
  mockEndpoints();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  const picker = await screen.findByLabelText("VAT % 1");
  await vi.waitFor(() =>
    expect([...picker.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "0%",
      "6%",
      "12%",
      "21%",
    ]),
  );
  expect(picker).toHaveValue("21");
});

test("a rate the server no longer offers is kept rather than silently re-taxed", async () => {
  // A draft written against an older list must not have its line quietly moved
  // to another rate because a select could not render the value it holds.
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.get(`${BASE}/vat-rates`, () =>
      HttpResponse.json({ ...VAT_RATES, rates: [{ rate: "21", label: "21%", is_default: true }] }),
    ),
  );
  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  const picker = await screen.findByLabelText("VAT % 1");
  await vi.waitFor(() => expect(picker.querySelectorAll("option")).toHaveLength(1));

  // Force a value off the served list, the way a loaded draft would.
  await user.selectOptions(picker, "21");
  expect(picker).toHaveValue("21");
});

test("an intra-EU business is reverse-charged, and the invoice says so", async () => {
  // Until GET /vat-treatment had a caller, every line shipped category "S" — so
  // this invoice went out charging 21% Belgian VAT to a Dutch company that owes
  // none, with no Article 51 §2 mention. Both halves are the point: the category
  // the server computes, and the rate that has to follow it, because a
  // reverse-charged line taxed at 21% is a contradictory document.
  let posted: { vat: { category: string; rate: string } }[] = [];
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(REVERSE_CHARGE_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "100.00",
        total_discount: "0.00",
        net_ht: "100.00",
        total_vat: "0.00",
        total_ttc: "100.00",
        vat_breakdown: {},
      }),
    ),
    http.post(`${BASE}/invoices`, async ({ request }) => {
      posted = ((await request.json()) as { lines: typeof posted }).lines;
      return HttpResponse.json(
        invoiceRecord("inv-1", null, { status: "draft", sequence_global: null }),
        { status: 201 },
      );
    }),
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");
  await user.type(screen.getByLabelText("Description 1"), "Consulting");
  await user.type(screen.getByLabelText("Unit price 1"), "100.00");

  // The rate follows the category onto the served list's own "0" option, not
  // onto a second one spelled differently.
  await vi.waitFor(() => expect(screen.getByLabelText("VAT % 1")).toHaveValue("0"));
  expect(screen.getByLabelText("VAT % 1").querySelectorAll("option")).toHaveLength(4);

  // And the claim is visible, mention included — it is what the customer's own
  // accountant looks for.
  expect(await screen.findByText(/reverse-charged to the customer/)).toBeInTheDocument();
  expect(screen.getByText(/article 51 §2/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await vi.waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0].vat).toEqual({ category: "AE", rate: "0" });
});

test("plain Belgian VAT announces nothing", async () => {
  // A banner on every ordinary invoice is a banner nobody reads, which is how
  // the one above stops being noticed on the invoice that needs it.
  mockEndpoints();
  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");

  await vi.waitFor(() => expect(screen.getByLabelText("VAT % 1")).toHaveValue("21"));
  expect(screen.queryByText(/VAT treatment/)).not.toBeInTheDocument();
});

test("a rate the user chose survives the treatment arriving", async () => {
  // The default moves lines that are still sitting on the old default. A line
  // the user deliberately set to 6% is theirs, and a reverse-charge answer
  // arriving a moment later must not quietly retax it.
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, async () => {
      // Late on purpose: the user gets to type before the answer lands.
      await new Promise((resolve) => setTimeout(resolve, 60));
      return HttpResponse.json(REVERSE_CHARGE_TREATMENT);
    }),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "100.00",
        total_discount: "0.00",
        net_ht: "100.00",
        total_vat: "6.00",
        total_ttc: "106.00",
        vat_breakdown: { "6": "6.00" },
      }),
    ),
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  const picker = await screen.findByLabelText("VAT % 1");
  await user.selectOptions(picker, "6");
  await user.selectOptions(screen.getByLabelText("Client"), "c-1");

  // The banner proves the treatment did arrive; the picker proves it was not
  // allowed to overwrite a deliberate choice.
  expect(await screen.findByText(/reverse-charged to the customer/)).toBeInTheDocument();
  expect(picker).toHaveValue("6");
});

test("a line is filled from the catalog, and says which product it is", async () => {
  // Typing a description and a price per invoice is how two invoices for the
  // same work end up at different prices. The catalog holds both, and the line
  // carries product_id so GET /reports/products can tell a sold catalog item
  // from a one-off someone typed.
  let posted: { description: string; unit_price: string; product_id: string | null }[] = [];
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(STANDARD_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "450.00",
        total_discount: "0.00",
        net_ht: "450.00",
        total_vat: "27.00",
        total_ttc: "477.00",
        vat_breakdown: { "6": "27.00" },
      }),
    ),
    http.post(`${BASE}/invoices`, async ({ request }) => {
      posted = ((await request.json()) as { lines: typeof posted }).lines;
      return HttpResponse.json(
        invoiceRecord("inv-1", null, { status: "draft", sequence_global: null }),
        { status: 201 },
      );
    }),
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");
  await user.selectOptions(await screen.findByLabelText("Item 1"), "p-1");

  // Description, price AND the product's own VAT rate — all three were typed
  // once, in the catalog.
  expect(screen.getByLabelText("Description 1")).toHaveValue("Audit day");
  expect(screen.getByLabelText("Unit price 1")).toHaveValue("450.00");

  // The rate lands on the served list's own option rather than appending a
  // second one spelled "6.00%", which is what the raw string would do.
  const rates = screen.getByLabelText("VAT % 1");
  expect(rates).toHaveValue("6");
  expect(rates.querySelectorAll("option")).toHaveLength(4);

  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await vi.waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0].product_id).toBe("p-1");
});

test("free text stays possible, and carries no product", async () => {
  // An invoice for something not in the catalog is an ordinary invoice, not an
  // error. Forcing a catalog entry for it would fill the catalog with things
  // nobody sells twice.
  let posted: { description: string; product_id: string | null }[] = [];
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(STANDARD_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "80.00",
        total_discount: "0.00",
        net_ht: "80.00",
        total_vat: "16.80",
        total_ttc: "96.80",
        vat_breakdown: { "21": "16.80" },
      }),
    ),
    http.post(`${BASE}/invoices`, async ({ request }) => {
      posted = ((await request.json()) as { lines: typeof posted }).lines;
      return HttpResponse.json(
        invoiceRecord("inv-1", null, { status: "draft", sequence_global: null }),
        { status: 201 },
      );
    }),
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");
  expect(screen.getByLabelText("Item 1")).toHaveValue("");

  await user.type(screen.getByLabelText("Description 1"), "Courier, one-off");
  await user.type(screen.getByLabelText("Unit price 1"), "80.00");

  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await vi.waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0].description).toBe("Courier, one-off");
  expect(posted[0].product_id).toBeNull();
});

test("a catalog rate does not survive a reverse-charged customer", async () => {
  // The product says 6%. This customer owes no Belgian VAT at all, and a line
  // carrying category AE at 6% is a contradictory document — so the treatment
  // wins over the catalog, and only over the catalog.
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(REVERSE_CHARGE_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/invoices/preview`, () =>
      HttpResponse.json({
        subtotal_ht: "450.00",
        total_discount: "0.00",
        net_ht: "450.00",
        total_vat: "0.00",
        total_ttc: "450.00",
        vat_breakdown: {},
      }),
    ),
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Client"), "c-1");
  await screen.findByText(/reverse-charged to the customer/);
  await user.selectOptions(screen.getByLabelText("Item 1"), "p-1");

  expect(screen.getByLabelText("Description 1")).toHaveValue("Audit day");
  expect(screen.getByLabelText("VAT % 1")).toHaveValue("0");
});

test("a catalog item can be created from the invoice, and lands on the line", async () => {
  // The detour this removes: leave the half-written invoice, go to Catalog,
  // create the item, come back, find the line again. The overlay keeps the
  // invoice on screen and puts the result straight onto the line that asked
  // for it.
  let posted: Record<string, unknown> | null = null;
  const created = {
    ...PRODUCT,
    id: "p-2",
    name: "Strategy workshop",
    unit_price: "1250.000000",
    default_vat_rate: "21.00",
  };

  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([CLIENT])),
    http.get(`${BASE}/vat-rates`, () => HttpResponse.json(VAT_RATES)),
    http.get(`${BASE}/vat-treatment`, () => HttpResponse.json(STANDARD_TREATMENT)),
    http.get(`${BASE}/products`, () => HttpResponse.json([PRODUCT])),
    http.post(`${BASE}/products`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(created, { status: 201 });
    }),
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
  );

  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.selectOptions(await screen.findByLabelText("Item 1"), "__new__");

  expect(await screen.findByText("New catalog item")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Name"), "Strategy workshop");
  await user.type(screen.getByLabelText("Unit price"), "1250.00");
  await user.click(screen.getByRole("button", { name: "Create" }));

  // Filled from the response rather than from a refetched catalog — the
  // invalidated products query is still in flight at this point.
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Description 1")).toHaveValue("Strategy workshop"),
  );
  expect(screen.getByLabelText("Unit price 1")).toHaveValue("1250.00");
  expect(screen.queryByText("New catalog item")).not.toBeInTheDocument();
  expect(posted).toMatchObject({
    company_id: COMPANY_ID,
    name: "Strategy workshop",
    unit_price: "1250.00",
  });
});

test("the overlay opens seeded from the line, so nothing is typed twice", async () => {
  // Someone types a description and a price, then realises it should be a
  // catalog item. Asking them to type it again is how the feature goes unused.
  mockEndpoints();
  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.type(await screen.findByLabelText("Description 1"), "Discovery day");
  await user.type(screen.getByLabelText("Unit price 1"), "600.00");
  await user.selectOptions(screen.getByLabelText("Item 1"), "__new__");

  expect(await screen.findByLabelText("Name")).toHaveValue("Discovery day");
  expect(screen.getByLabelText("Unit price")).toHaveValue("600.00");
});

test("cancelling the overlay leaves the line as it was", async () => {
  mockEndpoints();
  const user = userEvent.setup();
  renderWithProvider(<InvoiceBuilderPanel companyId={COMPANY_ID} />);

  await user.type(await screen.findByLabelText("Description 1"), "Discovery day");
  await user.selectOptions(screen.getByLabelText("Item 1"), "__new__");
  await user.click(await screen.findByRole("button", { name: "Cancel" }));

  expect(screen.queryByText("New catalog item")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Description 1")).toHaveValue("Discovery day");
  // The picker must not be left showing "+ New item…" as if it were a choice.
  expect(screen.getByLabelText("Item 1")).toHaveValue("");
});
