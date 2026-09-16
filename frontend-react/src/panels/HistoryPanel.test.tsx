import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  BASE,
  COMPANY_ID,
  companyRecord,
  invoiceRecord,
  isoDaysFromToday,
  renderWithProvider,
} from "../test/utils";
import { HistoryPanel } from "./HistoryPanel";

const server = setupServer();

const BIG_CORP = {
  id: "c-1",
  organization_id: "org-1",
  company_id: COMPANY_ID,
  name: "Big Corp",
  contact_person: null,
  email: null,
  phone: null,
  vat_number: "BE9876543265",
  address_line1: "Grote Markt 5",
  postal_code: "2000",
  city: "Antwerpen",
  country_code: "BE",
  is_business: true,
  notes: null,
};

/** The records the list and the record sheet read beside the invoices: the
 *  client index every row names its debtor from (T-45), and the two party
 *  records the sheet draws its blocks from.
 *
 *  Registered once, for every test in this file, rather than added to each
 *  `server.use(...)`: the sheet asks for them the moment a row is clicked, and
 *  a test that only cares about the Void button should not have to know that.
 *  They were unhandled at first and the panel degraded quietly — which is the
 *  behaviour the component was written to have, and exactly why the omission
 *  cost nothing visible and had to be found in the MSW log. */
beforeEach(() => {
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json([BIG_CORP])),
    http.get(`${BASE}/companies/:id`, () =>
      HttpResponse.json(
        companyRecord({
          legal_name: "Acme Consulting SPRL",
          vat_number: "BE0123456749",
          address_line1: "Rue de la Loi 1",
          postal_code: "1000",
          city: "Bruxelles",
          iban: "BE68539007547034",
        }),
      ),
    ),
    http.get(`${BASE}/clients/:id`, () => HttpResponse.json(BIG_CORP)),
  );
});

/** The invoice list, by name.
 *
 *  Named rather than "the only table on screen", which it stopped being when
 *  the record inspector became a document sheet carrying the invoice's own line
 *  table. Three tests failed on the ambiguity, which is the accessibility bug
 *  showing up as a test failure: two unnamed tables are two unnamed tables to a
 *  screen reader too.
 */
async function listTable() {
  return screen.findByRole("table", { name: "Invoices" });
}

/**
 * Actions moved out of the table row and into the N3 record inspector (a row
 * ending in five equal-weight buttons made none of them readable). Every action
 * test therefore opens the sheet first by clicking the row.
 */
async function openInvoice(user: ReturnType<typeof userEvent.setup>, reference: string) {
  const table = await listTable();
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
  const table = within(await listTable());
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
  await user.click(drawer.getByRole("button", { name: "More" }));
  await user.click(drawer.getByRole("menuitem", { name: "Void" }));
  const dialog = await screen.findByRole("dialog", { name: /Void/ });
  await user.type(
    within(dialog).getByLabelText("Reason for voiding"),
    "duplicate entry",
  );
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await listTable());
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
  // Due in the future, so the invoice it becomes on issue reads "Issued".
  return invoiceRecord(id, null, {
    status: "draft",
    sequence_global: null,
    due_date: isoDaysFromToday(30),
  });
}

test("a draft shows a Draft placeholder and badge, with its actions in the drawer", async () => {
  server.use(http.get(`${BASE}/invoices`, () => HttpResponse.json([draftRecord()])));

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();
  const table = within(await listTable());

  // The badge says Draft; the reference cell says what the draft lacks. Three
  // drafts that all read "Draft · Draft" and differed only by amount was the
  // row T-45 replaced.
  expect(table.getAllByText("Draft")).toHaveLength(1);
  expect(table.getByText("No number yet")).toBeInTheDocument();

  // Actions live in the record inspector, not the row.
  expect(screen.queryByRole("button", { name: "Issue" })).not.toBeInTheDocument();

  const drawer = await openInvoice(user, "Draft");
  expect(drawer.getByRole("button", { name: "Issue" })).toBeInTheDocument();
  expect(drawer.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  // Delete is destructive, so it sits behind More rather than on the strip.
  expect(drawer.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  await user.click(drawer.getByRole("button", { name: "More" }));
  expect(drawer.getByRole("menuitem", { name: "Delete" })).toHaveClass("bg-menu__item--danger");
  await user.keyboard("{Escape}");

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

  const table = within(await listTable());
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
  await user.click(deleteDrawer.getByRole("button", { name: "More" }));
  await user.click(deleteDrawer.getByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog", { name: /Delete/ });
  await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

  expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
});

test("recording a payment posts amount and the date picked in the calendar", async () => {
  // The payment date is a DatePicker (a calendar popup), not a text field, so
  // the date is chosen rather than typed. "Today" is used because it is the one
  // day that is deterministic without freezing the clock.
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Still on time: a part-paid invoice past its due date badges overdue, and
  // this test is about the payment changing the status, not the calendar.
  const record = invoiceRecord("inv-1", "ACME-BC07012026", { due_date: isoDaysFromToday(30) });
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
        paid_on: todayISO,
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
  await user.click(payDrawer.getByRole("button", { name: "Record payment" }));
  const dialog = await screen.findByRole("dialog", { name: /Payment/ });
  await user.type(within(dialog).getByLabelText("Amount"), "500.00");

  // Record stays disabled until a day is picked — paid_on is required and the
  // picker starts null, which a native `required` cannot see.
  expect(within(dialog).getByRole("button", { name: "Record" })).toBeDisabled();

  await user.click(within(dialog).getByLabelText("Payment date"));
  await user.click(await screen.findByRole("button", { name: "Today" }));
  await user.click(within(dialog).getByRole("button", { name: "Record" }));

  const table = within(await listTable());
  expect(await table.findByText("Partially paid")).toBeInTheDocument();
});

test("the status prop is the query, and there is no second filter on the panel", async () => {
  const seen: string[] = [];
  server.use(
    http.get(`${BASE}/invoices`, ({ request }) => {
      seen.push(new URL(request.url).searchParams.get("status") ?? "");
      return HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026", { status: "paid" })]);
    }),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} status="paid" />);
  await listTable();

  // The filter is a query parameter, not a client-side predicate over an
  // already-fetched list. The route's tabs set it; the panel used to add a
  // Status select of its own underneath them, two controls for one thing
  // (T-45), and must not grow one back.
  await waitFor(() => expect(seen).toContain("paid"));
  expect(screen.queryByRole("combobox", { name: "Status" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
});

/* ---- T-45: who owes you, and by when -------------------------------------
 * The list showed Reference · Date · Total · Status — no debtor, no deadline —
 * and an issued invoice 43 days past due badged as "Issued", because the
 * stored status is what the wire carries and only the server's reports refine
 * it with the calendar. The row now names the client, shows the due date, and
 * derives overdue the way the reports do.
 * ---------------------------------------------------------------------- */

test("a row names its client and its due date", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026", { status: "paid", due_date: "2026-08-03" }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const table = within(await listTable());

  expect(table.getByRole("columnheader", { name: /Client/ })).toBeInTheDocument();
  expect(table.getByRole("columnheader", { name: /Due date/ })).toBeInTheDocument();

  const row = table.getByText("ACME-BC07012026").closest("tr") as HTMLElement;
  expect(within(row).getByText("Big Corp")).toBeInTheDocument();
  expect(within(row).getByText("Aug 3, 2026")).toBeInTheDocument();
});

test("an issued invoice past its due date is badged overdue, with its age", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        // Stored status "issued": the wire has not refined it, the screen must.
        invoiceRecord("inv-1", "ACME-BC07012026", { status: "issued", due_date: isoDaysFromToday(-43) }),
        invoiceRecord("inv-2", "ACME-BC07022026", { status: "issued", due_date: isoDaysFromToday(-1) }),
        // Paid is closed; a due date in the past means nothing any more.
        invoiceRecord("inv-3", "ACME-BC07032026", { status: "paid", due_date: isoDaysFromToday(-90) }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const table = within(await listTable());

  const late = table.getByText("ACME-BC07012026").closest("tr") as HTMLElement;
  expect(within(late).getByText("Overdue · 43 days")).toBeInTheDocument();
  expect(within(late).queryByText("Issued")).not.toBeInTheDocument();

  const oneDay = table.getByText("ACME-BC07022026").closest("tr") as HTMLElement;
  expect(within(oneDay).getByText("Overdue · 1 day")).toBeInTheDocument();

  const paid = table.getByText("ACME-BC07032026").closest("tr") as HTMLElement;
  expect(within(paid).getByText("Paid")).toBeInTheDocument();
  expect(within(paid).queryByText(/Overdue/)).not.toBeInTheDocument();
});

test("the money header sits over its column", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const table = within(await listTable());

  // jsdom computes no layout, so the class the stylesheet keys on is the
  // assertion: the header carries the numeric modifier its cells carry.
  const header = table.getByRole("columnheader", { name: /Total/ });
  expect(header).toHaveClass("bg-table__th--num");
  const cell = table.getByText("€1,512.50").closest("td");
  expect(cell).toHaveClass("bg-table__cell--num");
});

/* ---- the record sheet, as a document ------------------------------------
 * Henri, 2026-09-04, replacing the right-hand drawer. What is worth pinning is
 * not the layout — that will keep moving — but the two claims the sheet makes:
 * it renders the invoice's OWN lines, and the stamp is a statement about the
 * document rather than a second copy of the status badge.
 * ---------------------------------------------------------------------- */

test("the record sheet renders the invoice as a document, with its lines", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026", {
          lines: [
            {
              line_number: 1,
              description: "Consulting — July",
              quantity: "10.000000",
              unit_price: "125.00",
              product_id: null,
              supply_kind: "services",
              vat: { category: "S", rate: "21.00", legal_mention: null },
              discount: null,
            },
          ],
        }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();
  const sheet = await openInvoice(user, "ACME-BC07012026");

  // Both parties, off the two records the sheet fetches for itself.
  expect(sheet.getByText("Acme Consulting SPRL")).toBeInTheDocument();
  expect(sheet.getByText("Big Corp")).toBeInTheDocument();

  const lines = within(sheet.getByRole("table", { name: "Invoice lines" }));
  expect(lines.getByText("Consulting — July")).toBeInTheDocument();
  // "10", not "10.000000" — the wire spells a quantity six decimals deep and a
  // document does not.
  expect(lines.getByText("10")).toBeInTheDocument();
  expect(lines.getByText("21 %")).toBeInTheDocument();
});

test("a zero-rated line prints its exempting mention on the paper", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026", {
          lines: [
            {
              line_number: 1,
              description: "Cross-border consulting",
              quantity: "1",
              unit_price: "1000.00",
              product_id: null,
              supply_kind: "services",
              vat: {
                category: "AE",
                rate: "0.00",
                legal_mention: "Autoliquidation — Article 51, §2, 5° du Code de la TVA",
              },
              discount: null,
            },
          ],
        }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();
  const sheet = await openInvoice(user, "ACME-BC07012026");

  // The one sentence that makes a zero-rated invoice lawful. If it ever stops
  // rendering, the document is wrong in a way no total would reveal.
  expect(
    sheet.getByText("Autoliquidation — Article 51, §2, 5° du Code de la TVA"),
  ).toBeInTheDocument();
});

test("only draft, paid and voided are stamped", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026", { status: "issued" }),
        invoiceRecord("inv-2", "ACME-BC07012027", { status: "paid" }),
        invoiceRecord("inv-3", "ACME-BC07012028", { status: "overdue" }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  // The chrome above the paper carries a status badge for every invoice
  // (T-47); the stamp is the ink ON the paper, and only it is asserted here.
  const stamp = () => document.querySelector(".bg-invdoc__stamp")?.textContent ?? null;

  // `issued` is what an invoice IS — a stamp on every ordinary invoice would
  // make the stamp mean nothing.
  await openInvoice(user, "ACME-BC07012026");
  expect(stamp()).toBeNull();
  await user.keyboard("{Escape}");

  await openInvoice(user, "ACME-BC07012027");
  expect(stamp()).toBe("Paid");
  await user.keyboard("{Escape}");

  // `overdue` describes the receivable and moves with the calendar. Permanent
  // ink must not carry a claim the paper cannot keep.
  await openInvoice(user, "ACME-BC07012028");
  expect(stamp()).toBeNull();
});

/* ---- T-47: the sheet leads with the action its status calls for ---------
 * Six equal-weight buttons, Void beside Credit note, and no status on the
 * sheet was the old strip. One primary per status; exports grouped; the
 * corrections behind More with Void last, after a separator, in danger ink.
 * ---------------------------------------------------------------------- */

function primaryActions(scope: HTMLElement): string[] {
  return [...scope.querySelectorAll(".bg-docsheet__actions .bg-button--primary")].map(
    (button) => button.textContent ?? "",
  );
}

test("an overdue invoice's sheet has one primary action, Record payment, and Void behind More", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        invoiceRecord("inv-1", "ACME-BC07012026", { status: "issued", due_date: isoDaysFromToday(-43) }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();
  const sheet = await openInvoice(user, "ACME-BC07012026");
  const dialog = screen.getByRole("dialog", { name: "ACME-BC07012026" });

  // The sheet says what it is, with its age, in the chrome above the paper.
  expect(sheet.getByText("Overdue · 43 days")).toBeInTheDocument();

  expect(primaryActions(dialog)).toEqual(["Record payment"]);

  // Void is nowhere on the strip until More is opened — and then it is last,
  // after a separator, in danger ink.
  expect(sheet.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  expect(sheet.queryByRole("menuitem", { name: "Void" })).not.toBeInTheDocument();
  await user.click(sheet.getByRole("button", { name: "More" }));
  const items = sheet.getAllByRole("menuitem");
  expect(items.map((item) => item.textContent)).toEqual(["Credit note", "Void"]);
  expect(items[1]).toHaveClass("bg-menu__item--danger");
  expect(sheet.getByRole("separator")).toBeInTheDocument();
  expect(sheet.getByRole("menu")).toHaveClass("bg-menu__popup--above");
});

test("a draft's sheet leads with Issue; a paid one has nothing left to lead with", async () => {
  server.use(
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([
        draftRecord("inv-1"),
        invoiceRecord("inv-2", "ACME-BC07022026", { status: "paid" }),
      ]),
    ),
  );

  renderWithProvider(<HistoryPanel companyId={COMPANY_ID} />);
  const user = userEvent.setup();

  await openInvoice(user, "Draft");
  expect(primaryActions(screen.getByRole("dialog", { name: "Draft" }))).toEqual(["Issue"]);
  await user.keyboard("{Escape}");

  const paid = await openInvoice(user, "ACME-BC07022026");
  expect(primaryActions(screen.getByRole("dialog", { name: "ACME-BC07022026" }))).toEqual([]);
  expect(paid.getByRole("button", { name: "Peppol XML" })).toBeInTheDocument();
  expect(paid.getByRole("button", { name: "More" })).toBeInTheDocument();
});
