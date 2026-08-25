import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { HistoryPanel } from "./HistoryPanel";

const server = setupServer();

/**
 * Actions moved out of the table row and into the N3 record inspector (a row
 * ending in five equal-weight buttons made none of them readable). Every action
 * test therefore opens the drawer first by clicking the row.
 */
async function openInvoice(user: ReturnType<typeof userEvent.setup>, reference: string) {
  const table = await screen.findByRole("table");
  // A draft shows "Draft" in both the reference cell and the status Badge, so
  // match the row rather than a cell and click that.
  const row = within(table).getAllByText(reference)[0].closest("tr");
  await user.click(row as HTMLElement);
  return within(await screen.findByRole("dialog", { name: reference }));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders invoices with status badges", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026"),
        invoiceRecord("inv-2", "ACME-BC07022026", { status: "paid" }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const table = within(await screen.findByRole("table"));
  expect(table.getByText("ACME-BC07012026")).toBeInTheDocument();
  expect(table.getByText("Paid")).toBeInTheDocument(); // Badge renders the canonical label
  expect(table.getAllByText("€1,512.50")).toHaveLength(2);
});

test("voiding an invoice asks for a reason and refreshes the list", async () => {
  const record = invoiceRecord("inv-1", "ACME-BC07012026");
  server.use(
    http.get(`${BASE}/invoices`, () => HttpResponse.json([record])),
    http.post(`${BASE}/invoices/inv-1/void`, async ({ request }) => {
      const body = (await request.json()) as { reason: string };
      expect(body.reason).toBe("duplicate entry");
      record.status = "voided";
      record.voided_reason = body.reason;
      return HttpResponse.json(record);
    }),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const drawer = await openInvoice(user, "ACME-BC07012026");
  await user.click(drawer.getByRole("button", { name: "Void" }));
  const dialog = await screen.findByRole("dialog", { name: /Void/ });
  await user.type(
    within(dialog).getByLabelText("Reason for voiding"),
    "duplicate entry",
  );
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("Voided")).toBeInTheDocument();
  // voided invoices lose their correction actions
  expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
});

test("downloads an invoice PDF (read-only re-render, no mutation)", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]),
    ),
    http.get(`${BASE}/invoices/inv-1/pdf`, () =>
      new HttpResponse(new Blob(["%PDF-1.7 fake"]), {
        headers: { "Content-Type": "application/pdf" },
      }),
    ),
  );

  // jsdom implements neither of these; stub so saveBlob can run.
  const createUrl = vi.fn((_blob: Blob) => "blob:mock");
  const revokeUrl = vi.fn();
  URL.createObjectURL = createUrl as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeUrl as typeof URL.revokeObjectURL;
  let savedAs = "";
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      savedAs = this.download;
    });

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const pdfDrawer = await openInvoice(user, "ACME-BC07012026");
  await user.click(pdfDrawer.getByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(clickSpy).toHaveBeenCalled());
  expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(savedAs).toBe("ACME-BC07012026.pdf");
  expect(revokeUrl).toHaveBeenCalled();

  clickSpy.mockRestore();
});

test("shows a confirmation once the PDF is saved", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]),
    ),
    http.get(`${BASE}/invoices/inv-1/pdf`, () =>
      new HttpResponse(new Blob(["%PDF-1.7 fake"]), {
        headers: { "Content-Type": "application/pdf" },
      }),
    ),
  );

  URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const savedDrawer = await openInvoice(user, "ACME-BC07012026");
  await user.click(savedDrawer.getByRole("button", { name: "Download PDF" }));

  // CopyButton in the drawer owns a role="status" live region too, so match the
  // save confirmation by its text rather than by role.
  expect(await screen.findByText(/Saved ACME-BC07012026\.pdf/)).toBeInTheDocument();

  clickSpy.mockRestore();
});

test("a blocked Peppol export lists the offending fields", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]),
    ),
    http.get(`${BASE}/invoices/inv-1/peppol.xml`, () =>
      HttpResponse.json(
        {
          detail: "Invoice is not deliverable over Peppol",
          errors: [
            { field: "company.vat", message_key: "errSupplierVat" },
            { field: "client.vat", message_key: "errCustomerVatB2C" },
          ],
        },
        { status: 422 },
      ),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const xmlDrawer = await openInvoice(user, "ACME-BC07012026");
  await user.click(xmlDrawer.getByRole("button", { name: "Peppol XML" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(
    "Peppol export blocked — fix the following before exporting:",
  );
  expect(alert).toHaveTextContent("Your company VAT number is missing or invalid.");
  expect(alert).toHaveTextContent("The client has no VAT number (B2C).");
});

function draftRecord(id = "inv-1") {
  return invoiceRecord(id, null, { status: "draft", sequence_global: null });
}

test("a draft shows a Draft placeholder and badge, with its actions in the drawer", async () => {
  server.use(http.get(`${BASE}/invoices`, () => HttpResponse.json([draftRecord()])));

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();
  const table = within(await screen.findByRole("table"));

  // "Draft" appears twice on the row: once as the reference placeholder (a
  // draft has no gapless number yet) and once as the status badge.
  expect(table.getAllByText("Draft")).toHaveLength(2);

  // Actions live in the record inspector, not the row.
  expect(screen.queryByRole("button", { name: "Issue" })).not.toBeInTheDocument();

  const drawer = await openInvoice(user, "Draft");
  expect(drawer.getByRole("button", { name: "Issue" })).toBeInTheDocument();
  expect(drawer.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  expect(drawer.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();

  // Still no gapless number, so no void / credit-note / Peppol actions anywhere.
  expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Credit note" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Peppol XML" })).not.toBeInTheDocument();
});

test("issuing a draft confirms then assigns a number", async () => {
  const draft = draftRecord();
  let issueBody: unknown = null;
  server.use(
    http.get(`${BASE}/invoices`, () => HttpResponse.json([draft])),
    http.post(`${BASE}/invoices/inv-1/issue`, async ({ request }) => {
      issueBody = await request.json();
      draft.status = "issued";
      draft.reference = "ACME-BC07012026";
      draft.sequence_global = 1;
      return HttpResponse.json(draft);
    }),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const issueDrawer = await openInvoice(user, "Draft");
  await user.click(issueDrawer.getByRole("button", { name: "Issue" }));
  // The drawer stays open behind the confirm modal, so scope to the modal.
  const dialog = await screen.findByRole("dialog", { name: /Issue/ });
  await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("Issued")).toBeInTheDocument();
  expect(table.getByText("ACME-BC07012026")).toBeInTheDocument();
  expect(issueBody).toEqual({}); // no date overrides sent
});

test("deleting a draft confirms then removes it", async () => {
  let deleted = false;
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json(deleted ? [] : [draftRecord()]),
    ),
    http.delete(`${BASE}/invoices/inv-1`, () => {
      deleted = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const deleteDrawer = await openInvoice(user, "Draft");
  await user.click(deleteDrawer.getByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog", { name: /Delete/ });
  await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

  expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
});

test("recording a payment posts amount and date", async () => {
  const record = invoiceRecord("inv-1", "ACME-BC07012026");
  server.use(
    http.get(`${BASE}/invoices`, () => HttpResponse.json([record])),
    http.post(`${BASE}/payments`, async ({ request }) => {
      const body = (await request.json()) as {
        invoice_id: string;
        amount: string;
        paid_on: string;
      };
      expect(body).toMatchObject({
        invoice_id: "inv-1",
        amount: "500.00",
        paid_on: "2026-07-20",
      });
      record.status = "partially_paid";
      return HttpResponse.json(
        { payment: { id: "pay-1" }, invoice_status: "partially_paid" },
        { status: 201 },
      );
    }),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  const payDrawer = await openInvoice(user, "ACME-BC07012026");
  await user.click(payDrawer.getByRole("button", { name: "Payment" }));
  const dialog = await screen.findByRole("dialog", { name: /Payment/ });
  await user.type(within(dialog).getByLabelText("Amount"), "500.00");
  await user.type(within(dialog).getByLabelText("Payment date"), "2026-07-20");
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("Partially paid")).toBeInTheDocument();
});
