/** Compose an invoice: pick a client, edit lines, watch live totals from the
 *  API's /invoices/preview (the ONLY source of VAT math — never computed here),
 *  then create. Preview consumes no invoice number. */

import { useEffect, useId, useMemo, useState } from "react";

import { Button, Spinner } from "@henrioutai/ui";
import { useClients, useCreateInvoice, useInvoicePreview, useVatRates } from "../hooks/queries";
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

/** The fallback rate, used only until GET /vat-rates answers.
 *
 *  It is deliberately the same 21 the server calls default, and deliberately
 *  not a LIST of rates: the four Belgian rates live in core/rules/vat.py and
 *  are served by /vat-rates, so a copy of them here would be a second law
 *  that nobody would remember to change when the first one moved. One value
 *  keeps a line editable during the first paint; the picker below is the
 *  server's. */
const FALLBACK_RATE = "21";

const EMPTY_LINE: LineDraft = {
  description: "",
  quantity: "1",
  unitPrice: "",
  vatRate: FALLBACK_RATE,
};

function toApiLines(drafts: LineDraft[]): InvoiceLineIn[] {
  return drafts.map((draft) => ({
    description: draft.description,
    quantity: draft.quantity,
    unit_price: draft.unitPrice,
    // The RATE is now the server's (GET /vat-rates); the CATEGORY is still
    // hardcoded standard, and that is a backend question rather than a picker.
    // core/rules/vat.py has pick_category() — buyer country, buyer VAT number,
    // seller country — and no route calls it, so a reverse-charge or export
    // line cannot be composed here whatever this select offers.
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
  const vatRates = useVatRates();
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

  // The rates the server says exist, defaulting to whatever it flags as default.
  // Until it answers there is exactly one option — the rate the empty line
  // already holds — so the select is never blank and never offers a rate the
  // backend would refuse.
  const served = vatRates.data?.rates ?? [];
  const defaultRate = served.find((option) => option.is_default)?.rate ?? FALLBACK_RATE;
  const rateOptions = served.length
    ? served
    : [{ rate: FALLBACK_RATE, label: `${FALLBACK_RATE}%`, is_default: true }];

  /** A line can hold a rate the current list does not contain — a draft written
   *  before the list changed. Dropping it would silently re-tax the line, so it
   *  is offered alongside the served ones instead. */
  const optionsFor = (rate: string) =>
    rateOptions.some((option) => option.rate === rate)
      ? rateOptions
      : [...rateOptions, { rate, label: `${rate}%`, is_default: false }];

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
                <select
                  aria-label={`${t(lang, "invoice.vatRate")} ${index + 1}`}
                  className="bg-field__input"
                  value={line.vatRate}
                  onChange={(event) => setLine(index, { vatRate: event.target.value })}
                >
                  {optionsFor(line.vatRate).map((option) => (
                    <option key={option.rate} value={option.rate}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

      <Button
        variant="secondary"
        onClick={() => setLines((current) => [...current, { ...EMPTY_LINE, vatRate: defaultRate }])}
      >
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
