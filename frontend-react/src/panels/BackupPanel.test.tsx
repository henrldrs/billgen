/** T-28's UI half: the sealed export cannot be requested until the person
 *  has read the notice and said so, and a sealed archive is restored through
 *  the file endpoint with its passphrase in a header, never a query string. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, test, vi } from "vitest";

import { BASE, renderWithProvider } from "../test/utils";
import { BackupPanel } from "./BackupPanel";

const server = setupServer(
  http.get(`${BASE}/backup/passphrase-notice`, () =>
    HttpResponse.json({
      notice: "This passphrase is never stored and cannot be recovered.",
      minimum_length: 12,
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("the sealed export waits for a long enough passphrase and the acknowledgement", async () => {
  let sent: { passphrase: string; acknowledge_unrecoverable: boolean } | null = null;
  server.use(
    http.post(`${BASE}/backup/export/encrypted`, async ({ request }) => {
      sent = (await request.json()) as typeof sent;
      return new HttpResponse(new Uint8Array([1, 2, 3]), {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Backup-Documents": "4",
        },
      });
    }),
  );

  renderWithProvider(<BackupPanel />);

  //  The server's sentence, before the field.
  expect(await screen.findByText(/never stored and cannot be recovered/)).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Download sealed backup" });
  expect(button).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Passphrase"), "short");
  await userEvent.click(screen.getByRole("checkbox", { name: /lost passphrase is a lost backup/ }));
  expect(button).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Passphrase"), "-but-now-long-enough");
  expect(button).toBeEnabled();
  await userEvent.click(button);

  await screen.findByText("Sealed backup saved — 4 documents inside.");
  expect(sent).toEqual({
    passphrase: "short-but-now-long-enough",
    acknowledge_unrecoverable: true,
  });
});

test("a sealed archive is restored through the file endpoint, passphrase in a header", async () => {
  let header: string | null = null;
  let bodySize = 0;
  server.use(
    http.post(`${BASE}/backup/restore/file`, async ({ request }) => {
      header = request.headers.get("X-Backup-Passphrase");
      bodySize = (await request.arrayBuffer()).byteLength;
      return HttpResponse.json({
        companies: 1,
        clients: 3,
        products: 0,
        invoices: 12,
        quotes: 0,
        credit_notes: 0,
        payments: 5,
        documents: 12,
        documents_missing: [],
        sequences_restored: 1,
      });
    }),
  );

  renderWithProvider(<BackupPanel />);
  const input = document.querySelector("input[type=file]") as HTMLInputElement;
  const archive = new File([new Uint8Array(64)], "billgen-backup-2026-09-13.billgenbak");
  await userEvent.upload(input, archive);

  //  A sealed archive asks for its passphrase; until it has one the restore
  //  button stays dead.
  const restore = screen.getByRole("button", { name: "Restore this backup" });
  expect(restore).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Passphrase of the archive"), "open-sesame-please");
  expect(restore).toBeEnabled();

  await userEvent.click(restore);
  await userEvent.click(screen.getAllByRole("button", { name: "Restore this backup" }).at(-1) as HTMLElement);

  await waitFor(() => expect(header).toBe("open-sesame-please"));
  expect(bodySize).toBe(64);
  expect(await screen.findByText("Backup restored")).toBeInTheDocument();
  expect(screen.getByText(/invoices: 12/)).toBeInTheDocument();
});

test("a plain JSON export still goes to the JSON endpoint", async () => {
  let received: unknown = null;
  server.use(
    http.post(`${BASE}/backup/restore`, async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({
        companies: 1,
        clients: 0,
        products: 0,
        invoices: 0,
        quotes: 0,
        credit_notes: 0,
        payments: 0,
        documents: 0,
        documents_missing: [],
        sequences_restored: 0,
      });
    }),
  );

  renderWithProvider(<BackupPanel />);
  const input = document.querySelector("input[type=file]") as HTMLInputElement;
  await userEvent.upload(
    input,
    new File([JSON.stringify({ format: "billgen-backup", companies: [] })], "backup.json", {
      type: "application/json",
    }),
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "Restore this backup" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Restore this backup" }));
  await userEvent.click(screen.getAllByRole("button", { name: "Restore this backup" }).at(-1) as HTMLElement);

  await waitFor(() => expect(received).toEqual({ format: "billgen-backup", companies: [] }));
});
