/** Compose an invoice: pick a client, edit lines, watch live totals from the
 *  API's /invoices/preview (the ONLY source of VAT math — never computed here),
 *  then create. Preview consumes no invoice number. */

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Banner, Button, Modal, Spinner } from "@henrioutai/ui";
import {
  useClients,
  useCreateInvoice,
  useCreateProduct,
  useInvoicePreview,
  useProducts,
  useVatRates,
  useVatTreatment,
} from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { t, tVatReason, type Lang } from "../lib/translations";
import type { InvoiceLineIn, InvoiceResponse, ProductResponse } from "../types";

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
  /** The catalog item this line came from, or null for a free-text line.
   *
   *  Kept even after the description is edited: a line is still that product
   *  when it has been re-worded for one customer, and dropping the link would
   *  quietly move the revenue into the free-text bucket that
   *  GET /reports/products has to report separately. Cleared only by choosing
   *  free text in the picker. */
  productId: string | null;
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

/** The picker's "create one" option. A sentinel rather than an empty value,
 *  because "" already means free text and the two are opposite intentions. */
const NEW_PRODUCT = "__new__";

const EMPTY_LINE: LineDraft = {
  description: "",
  quantity: "1",
  unitPrice: "",
  vatRate: FALLBACK_RATE,
  productId: null,
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
    product_id: draft.productId,
    vat: { category, rate: draft.vatRate },
  }));
}

/** A stored price for an editable field.
 *
 *  The catalog serialises its price as the column holds it — "850.000000" —
 *  which is right for arithmetic and wrong for a text input someone is about to
 *  edit. Trailing zeros past the second decimal are noise the user has to clear
 *  by hand; stopping short of two would read as a truncated price. Anything
 *  with real precision beyond two decimals keeps it, because some unit prices
 *  genuinely have it.
 */
function trimPrice(value: string): string {
  if (!/^-?\d+\.\d+$/.test(value)) return value;
  const [whole, fraction = ""] = value.replace(/0+$/, "").split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
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
  const newNameId = useId();
  const newPriceId = useId();
  const newRateId = useId();
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

  /** A rate, expressed the way the served list expresses it.
   *
   *  Every rate in this screen comes from core/rules/vat.py, but they arrive
   *  through three separately serialised decimals — /vat-rates says "21", a
   *  product says "21.00", a treatment says "0". Those are the same rates and
   *  different strings, and the select matches on the string: an unnormalised
   *  one appends a second option beside the identical served one, which reads
   *  as a stale draft's rate. Compare numerically, then take the list's own
   *  spelling. */
  const servedSpelling = (rate: string) =>
    served.find((option) => Number(option.rate) === Number(rate))?.rate ?? rate;

  const advisedRate = treatment.data?.rate;
  const defaultRate =
    advisedRate === undefined ? standardDefaultRate : servedSpelling(String(advisedRate));

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

  // The catalog. Only sellable items: an archived product is archived because
  // nobody should be putting it on a new invoice, and a draft one is not
  // finished being priced.
  const { data: catalog } = useProducts({ companyId, status: "active" });
  const createProduct = useCreateProduct();

  /* Which line opened the "new item" overlay, or null. The INDEX rather than a
     boolean: the overlay has to know which line to drop the result onto, and a
     second line opened while the first was pending would otherwise fill the
     wrong one. */
  const [newItemFor, setNewItemFor] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newRate, setNewRate] = useState("");

  const setLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  /** Fill a line from a catalog item — or empty the link, for free text.
   *
   *  Description, price and VAT rate are the product's, which is the whole
   *  point: they were typed once, in the catalog, and re-typing them per
   *  invoice is how two invoices for the same work end up at different prices.
   *
   *  The one thing a product does NOT get to set is the rate when this
   *  customer is not charged Belgian VAT. A catalog item's 21% is the rate for
   *  a domestic sale; on a reverse-charged invoice it would contradict the
   *  category on the same line, so the treatment wins. */
  const fillFromProduct = (index: number, product: ProductResponse) =>
    setLine(index, {
      productId: product.id,
      description: product.name,
      unitPrice: trimPrice(product.unit_price),
      vatRate:
        category === "S"
          ? servedSpelling(product.default_vat_rate ?? defaultRate)
          : defaultRate,
    });

  const pickProduct = (index: number, productId: string) => {
    if (productId === "") {
      setLine(index, { productId: null });
      return;
    }
    if (productId === NEW_PRODUCT) {
      // Seed the overlay from the line, so someone who typed a description and
      // a price and only then realised it should be a catalog item does not
      // type them again.
      const line = lines[index];
      setNewName(line.description);
      setNewPrice(line.unitPrice);
      setNewRate(servedSpelling(line.vatRate));
      setNewItemFor(index);
      return;
    }
    const product = (catalog ?? []).find((item) => item.id === productId);
    if (!product) return;
    fillFromProduct(index, product);
  };

  const closeNewItem = () => {
    setNewItemFor(null);
    createProduct.reset();
  };

  const submitNewItem = () => {
    if (newItemFor === null || newName.trim() === "" || newPrice.trim() === "") return;
    const index = newItemFor;

    createProduct.mutate(
      {
        company_id: companyId,
        name: newName.trim(),
        unit_price: newPrice.trim(),
        default_vat_rate: newRate || defaultRate,
      },
      {
        onSuccess: (product) => {
          // Filled from the RESPONSE, not from a refetched catalog. The
          // mutation invalidates ["products"], but that refetch is in flight
          // when this runs, so looking the new item up in `catalog` would find
          // nothing and silently leave the line empty.
          fillFromProduct(index, product);
          closeNewItem();
        },
      },
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

      <Modal
        open={newItemFor !== null}
        onClose={closeNewItem}
        title={t(lang, "invoice.newProductTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeNewItem}>
              {t(lang, "common.cancel")}
            </Button>
            <Button
              onClick={submitNewItem}
              disabled={
                newName.trim() === "" || newPrice.trim() === "" || createProduct.isPending
              }
            >
              {t(lang, "common.create")}
            </Button>
          </>
        }
      >
        <div className="bg-field">
          <label className="bg-field__label" htmlFor={newNameId}>
            {t(lang, "invoice.productName")}
          </label>
          <input
            id={newNameId}
            className="bg-field__input"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <div className="bg-field">
          <label className="bg-field__label" htmlFor={newPriceId}>
            {t(lang, "invoice.unitPrice")}
          </label>
          <input
            id={newPriceId}
            className="bg-field__input"
            inputMode="decimal"
            value={newPrice}
            onChange={(event) => setNewPrice(event.target.value)}
          />
        </div>
        <div className="bg-field">
          <label className="bg-field__label" htmlFor={newRateId}>
            {t(lang, "invoice.vatRate")}
          </label>
          <select
            id={newRateId}
            className="bg-field__input"
            value={newRate || defaultRate}
            onChange={(event) => setNewRate(event.target.value)}
          >
            {optionsFor(newRate || defaultRate).map((option) => (
              <option key={option.rate} value={option.rate}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {/* Three fields, not the catalog's whole form. What an invoice line
            needs is a name, a price and a rate; category, tags and billing type
            are catalog housekeeping and asking for them here turns "add this
            one thing" back into the detour it is meant to remove. */}
        <p className="bg-field__hint">{t(lang, "invoice.newProductHint")}</p>
        {createProduct.isError ? (
          <Banner tone="danger">{t(lang, "common.error")}</Banner>
        ) : null}
      </Modal>

      <table className="bg-table bg-table--editable">
        <thead>
          <tr>
            <th>{t(lang, "invoice.product")}</th>
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
                {/* The catalog, not a memory test. Prices and wording live in
                    one place, and a line that came from the catalog carries
                    its product_id, which is what lets GET /reports/products
                    tell a sold item from a one-off typed by hand.

                    Free text stays first and stays available: an invoice for
                    something not in the catalog is an ordinary invoice, not an
                    error, and forcing a catalog entry for it would fill the
                    catalog with things nobody sells twice. */}
                <select
                  aria-label={`${t(lang, "invoice.product")} ${index + 1}`}
                  className="bg-field__input"
                  value={line.productId ?? ""}
                  onChange={(event) => pickProduct(index, event.target.value)}
                >
                  <option value="">{t(lang, "invoice.freeText")}</option>
                  {(catalog ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                  {/* Last, not first: the common case is picking something that
                      already exists, and an option that opens a dialog should
                      not sit where a mis-click lands. */}
                  <option value={NEW_PRODUCT}>{t(lang, "invoice.newProduct")}</option>
                </select>
              </td>
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
