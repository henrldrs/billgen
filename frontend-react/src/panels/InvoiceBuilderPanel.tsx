/** Compose an invoice: pick a client, edit lines, watch live totals from the
 *  API's /invoices/preview (the ONLY source of VAT math — never computed here),
 *  then create. Preview consumes no invoice number. */

import { useEffect, useId, useMemo, useState } from "react";

import { Button, Spinner } from "@henrioutai/ui";
import { useClients, useCreateInvoice, useInvoicePreview } from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import type { InvoiceLineIn, InvoiceResponse } from "../types";

export interface InvoiceBuilderPanelProps {
  companyId: string;
  lang?: Lang;
  onCreated?: (invoice: InvoiceResponse) => void;
}

interface LineDraft {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
}

const EMPTY_LINE: LineDraft = { description: "", quantity: "1", unitPrice: "", vatRate: "21" };

function toApiLines(drafts: LineDraft[]): InvoiceLineIn[] {
  return drafts.map((draft) => ({
    description: draft.description,
    quantity: draft.quantity,
    unit_price: draft.unitPrice,
    vat: { category: "S", rate: draft.vatRate },
  }));
}

function linesAreValid(drafts: LineDraft[]): boolean {
  return (
    drafts.length > 0 &&
    drafts.every(
      (draft) =>
        draft.description.trim() !== "" &&
        Number(draft.quantity) > 0 &&
        draft.unitPrice.trim() !== "" &&
        !Number.isNaN(Number(draft.unitPrice)),
    )
  );
}

export function InvoiceBuilderPanel({
  companyId,
  lang = "en",
  onCreated,
}: InvoiceBuilderPanelProps) {
  const clientSelectId = useId();
  const { data: clients, isLoading } = useClients(companyId);
  const preview = useInvoicePreview();
  const createInvoice = useCreateInvoice();

  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [comments, setComments] = useState("");
  // A saved invoice starts as a DRAFT (no number yet), so there's no reference to
  // show — just confirm it was saved and point the user to Invoices to issue it.
  const [draftSaved, setDraftSaved] = useState(false);

  const valid = linesAreValid(lines);
  const serializedLines = useMemo(() => JSON.stringify(lines), [lines]);

  useEffect(() => {
    if (!valid) return;
    preview.mutate({ lines: toApiLines(lines), currency: "EUR" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serializedLines covers `lines`
  }, [serializedLines, valid]);

  const setLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const handleCreate = () => {
    createInvoice.mutate(
      {
        company_id: companyId,
        client_id: clientId,
        lines: toApiLines(lines),
        comments: comments || null,
      },
      {
        onSuccess: (invoice) => {
          setDraftSaved(true);
          setClientId("");
          setLines([{ ...EMPTY_LINE }]);
          setComments("");
          onCreated?.(invoice);
        },
      },
    );
  };

  if (isLoading) return <Spinner label={t(lang, "common.loading")} />;

  const totals = valid ? preview.data : undefined;

  return (
    <section className="bg-panel" aria-label={t(lang, "invoice.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "invoice.title")}</h1>
      </header>

      {draftSaved ? (
        <div className="bg-banner bg-banner--success" role="status">
          {t(lang, "invoice.created")}
        </div>
      ) : null}

      <div className="bg-field">
        <label className="bg-field__label" htmlFor={clientSelectId}>
          {t(lang, "invoice.client")}
        </label>
        <select
          id={clientSelectId}
          className="bg-field__input"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        >
          <option value="">{t(lang, "invoice.selectClient")}</option>
          {(clients ?? []).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <table className="bg-table bg-table--editable">
        <thead>
          <tr>
            <th>{t(lang, "invoice.description")}</th>
            <th>{t(lang, "invoice.quantity")}</th>
            <th>{t(lang, "invoice.unitPrice")}</th>
            <th>{t(lang, "invoice.vatRate")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td>
                <input
                  aria-label={`${t(lang, "invoice.description")} ${index + 1}`}
                  className="bg-field__input"
                  value={line.description}
                  onChange={(event) => setLine(index, { description: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`${t(lang, "invoice.quantity")} ${index + 1}`}
                  className="bg-field__input"
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => setLine(index, { quantity: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`${t(lang, "invoice.unitPrice")} ${index + 1}`}
                  className="bg-field__input"
                  inputMode="decimal"
                  value={line.unitPrice}
                  onChange={(event) => setLine(index, { unitPrice: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`${t(lang, "invoice.vatRate")} ${index + 1}`}
                  className="bg-field__input"
                  inputMode="decimal"
                  value={line.vatRate}
                  onChange={(event) => setLine(index, { vatRate: event.target.value })}
                />
              </td>
              <td>
                {lines.length > 1 ? (
                  <Button
                    variant="secondary"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    {t(lang, "invoice.removeLine")}
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button variant="secondary" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
        {t(lang, "invoice.addLine")}
      </Button>

      <div className="bg-field">
        <label className="bg-field__label" htmlFor={`${clientSelectId}-comments`}>
          {t(lang, "invoice.comments")}
        </label>
        <textarea
          id={`${clientSelectId}-comments`}
          className="bg-field__input"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
        />
      </div>

      {totals ? (
        <dl className="bg-totals" aria-label="totals">
          <div>
            <dt>{t(lang, "invoice.subtotal")}</dt>
            <dd>{formatMoney(totals.net_ht, "EUR", lang)}</dd>
          </div>
          <div>
            <dt>{t(lang, "invoice.vat")}</dt>
            <dd>{formatMoney(totals.total_vat, "EUR", lang)}</dd>
          </div>
          <div className="bg-totals__grand">
            <dt>{t(lang, "invoice.total")}</dt>
            <dd>{formatMoney(totals.total_ttc, "EUR", lang)}</dd>
          </div>
        </dl>
      ) : null}

      {createInvoice.isError ? <div role="alert">{t(lang, "common.error")}</div> : null}

      <div className="bg-panel__actions">
        <Button
          onClick={handleCreate}
          disabled={!valid || clientId === "" || createInvoice.isPending}
        >
          {t(lang, "invoice.create")}
        </Button>
      </div>
    </section>
  );
}
