import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { HistoryPanel } from "./HistoryPanel";

const server = setupServer();

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
  expect(table.getByText("paid")).toBeInTheDocument(); // scoped: "paid" is also a filter option
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

  await user.click(await screen.findByRole("button", { name: "Void" }));
  const dialog = await screen.findByRole("dialog");
  await user.type(
    within(dialog).getByLabelText("Reason for voiding"),
    "duplicate entry",
  );
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("voided")).toBeInTheDocument();
  // voided invoices lose their action buttons
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

  await user.click(await screen.findByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(clickSpy).toHaveBeenCalled());
  expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(savedAs).toBe("ACME-BC07012026.pdf");
  expect(revokeUrl).toHaveBeenCalled();

  clickSpy.mockRestore();
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

  await user.click(await screen.findByRole("button", { name: "Payment" }));
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Amount"), "500.00");
  await user.type(within(dialog).getByLabelText("Payment date"), "2026-07-20");
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("partially_paid")).toBeInTheDocument();
});
