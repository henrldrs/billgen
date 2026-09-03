/** Compose an invoice: pick a client, edit lines, watch live totals from the
 *  API's /invoices/preview (the ONLY source of VAT math — never computed here),
 *  then create. Preview consumes no invoice number. */

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Banner, Button, Spinner } from "@henrioutai/ui";
import {
  useClients,
  useCreateInvoice,
  useInvoicePreview,
  useVatRates,
  useVatTreatment,
} from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { t, tVatReason, type Lang } from "../lib/translations";
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

/** `category` is the whole invoice's, not a per-line choice.
 *
 *  Both halves are the server's now. The rate comes from GET /vat-rates, and
 *  the category from GET /vat-treatment, which runs core/rules/vat.pick_category
 *  over buyer country, buyer VAT number and seller country. Until that route
 *  existed every line shipped "S" — correct for a Belgian seller billing a
 *  Belgian customer, and wrong for the two cases the rule exists for.
 *
 *  It is not per line because nothing about a line decides it: the same pair of
 *  countries and VAT numbers governs every line on the document. */
function toApiLines(drafts: LineDraft[], category: string): InvoiceLineIn[] {
  return drafts.map((draft) => ({
    description: draft.description,
    quantity: draft.quantity,
    unit_price: draft.unitPrice,
    vat: { category, rate: draft.vatRate },
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

  // What this seller/buyer pair implies. Advisory: it defaults the document,
  // it does not lock it.
  const treatment = useVatTreatment(companyId, clientId || undefined, lang);
  const category = treatment.data?.category ?? "S";

  useEffect(() => {
    if (!valid) return;
    preview.mutate({ lines: toApiLines(lines, category), currency: "EUR" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serializedLines covers `lines`
  }, [serializedLines, valid, category]);

  // The rates the server says exist, defaulting to whatever it flags as default.
  // Until it answers there is exactly one option — the rate the empty line
  // already holds — so the select is never blank and never offers a rate the
  // backend would refuse.
  const served = vatRates.data?.rates ?? [];
  const standardDefaultRate = served.find((option) => option.is_default)?.rate ?? FALLBACK_RATE;

  /** The treatment's rate, expressed the way the served list expresses it.
   *
   *  Both come from core/rules/vat.py, but they arrive as separately serialised
   *  decimals — "0" and "0.00" are the same rate and different strings, and the
   *  select matches on the string. Comparing numerically and then taking the
   *  served spelling keeps a zero-rated line on the list's own option instead
   *  of appending a second one that looks like a stale draft's. */
  const advisedRate = treatment.data?.rate;
  const defaultRate =
    advisedRate === undefined
      ? standardDefaultRate
      : (served.find((option) => Number(option.rate) === Number(advisedRate))?.rate ??
        String(advisedRate));

  /* Move the lines onto a new default when the treatment changes — but only the
     ones still sitting on the old one. A reverse-charged line taxed at 21% is a
     contradictory invoice, so the rate has to follow the category; a rate the
     user actually chose is theirs and is left alone. */
  const appliedDefault = useRef(defaultRate);
  useEffect(() => {
    const previous = appliedDefault.current;
    if (previous === defaultRate) return;
    appliedDefault.current = defaultRate;
    setLines((current) =>
      current.map((line) => (line.vatRate === previous ? { ...line, vatRate: defaultRate } : line)),
    );
  }, [defaultRate]);
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
        lines: toApiLines(lines, category),
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

      {/* Shown only when the treatment is NOT plain Belgian VAT. A line that has
          silently become reverse-charged or zero-rated for export is a legal
          claim about the document, and the person composing it has to be able
          to see that it was made — the mention itself is what the customer's
          own accountant will look for. Standard VAT needs no announcement: a
          banner on every ordinary invoice is a banner nobody reads. */}
      {treatment.data && category !== "S" ? (
        <Banner tone="info" title={t(lang, "invoice.vatTreatment")}>
          {tVatReason(lang, treatment.data.reason)}
          {/* The mention is set apart rather than joined with a dash: the reason
              is a sentence and the mention is a quotation — the exact words that
              will be printed on the document — and running them together reads
              as one long clause with two dashes in it. */}
          {treatment.data.legal_mention ? (
            <> <strong>{treatment.data.legal_mention}</strong></>
          ) : null}
        </Banner>
      ) : null}

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
