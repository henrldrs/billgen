/** The invoice, drawn as the document it will be.
 *
 *  Henri, 2026-09-04, on the drawer this replaces: "maybe instead of outputting
 *  the invoice on the side, we centralise it? Make it the table of the invoice,
 *  to illustrate as if it were a document."
 *
 *  So this is not a summary of an invoice, it is a *rendering* of one: the two
 *  party blocks, the dates, the ruled line table, the totals under the table's
 *  right edge, and the mandatory mentions at the foot — in the order and the
 *  places they occupy on the printed page.
 *
 *  **It is an illustration, not the document.** The authoritative render is
 *  `GET /invoices/{id}/pdf`, which draws from the invoice's own frozen
 *  `template_snapshot`; this one draws from the current company record and a
 *  fixed layout, so a company that changes its address will see the new address
 *  here and the old one on the PDF the client received. That is the correct
 *  division — the PDF is what was sent, this is what is on file — and it is why
 *  "Download PDF" sits under the sheet rather than being replaced by it.
 */

import { formatDate, formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import type { ClientResponse, CompanyResponse, InvoiceResponse } from "../types";

export interface InvoiceDocumentProps {
  invoice: InvoiceResponse;
  /** The issuer. Undefined while the company query is in flight — the sheet
   *  renders without the block rather than holding the whole document back for
   *  a record the reader can already see the rest without. */
  company?: CompanyResponse;
  client?: ClientResponse;
  lang?: Lang;
}

/** A decimal string off the wire, as a number.
 *
 *  Quantities arrive as `"10.000000"` and rates as `"21.00"`, and both have to
 *  be printed the way a person writes them. `formatMoney` covers the amounts;
 *  this covers everything that is a count or a percentage.
 */
function decimal(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function plain(value: string | number | null | undefined): string {
  const n = decimal(value);
  // `10.000000` → `10`, `1.5` → `1.5`. An invoice writes "10", not "10.000000".
  return String(Number(n.toFixed(4)));
}

/** The postal block for either party, in the order a Belgian address is read. */
function AddressBlock({
  label,
  name,
  vat,
  lines,
}: {
  label: string;
  name: string;
  vat?: string | null;
  lines: (string | null | undefined)[];
}) {
  return (
    <div>
      <p className="bg-invdoc__party-label">{label}</p>
      <address className="bg-invdoc__party">
        <strong>{name}</strong>
        {lines.filter(Boolean).map((line, index) => (
          <span key={index}>
            {line}
            <br />
          </span>
        ))}
        {vat ? <span className="bg-num">{vat}</span> : null}
      </address>
    </div>
  );
}

/** Which statuses earn a stamp on the paper, and which do not.
 *
 *  Henri, 2026-09-04, on the DRAFT stamp: "is it pertinent to make one for
 *  paid, sent etc?" — for some of them, and the line is worth stating because
 *  it is not "one stamp per status".
 *
 *  A stamp on a document is a claim about **the document's own standing**, and
 *  only three statuses make one:
 *
 *  - `draft` — this is not an invoice yet. No number has been consumed and
 *    nothing about it is final. The most important stamp of the three.
 *  - `paid` — settled. The oldest stamp in accounting, and it says something
 *    permanent about this piece of paper.
 *  - `voided` — annulled. The document still exists as a record and must never
 *    be mistaken for a live one.
 *
 *  The rest deliberately get nothing:
 *
 *  - `issued` is what an invoice *is*. Stamping every ordinary invoice ISSUED
 *    would make the stamp meaningless — the absence of one is the signal.
 *  - `overdue` and `partially_paid` describe the **receivable**, not the
 *    document, and they change with the calendar and with the next payment. A
 *    stamp is permanent ink; printing one for a state that moves would put a
 *    claim on the paper that the paper cannot keep. They belong in the list
 *    and on the record screen, where they already are.
 *  - `sent` / `viewed` are not statuses at all — there is no `InvoiceStatus`
 *    behind them, which is why those two tabs render disabled.
 */
function stampFor(
  status: string,
): { key: "history.draft" | "history.paidStamp" | "history.voided"; tone: string } | null {
  if (status === "draft") return { key: "history.draft", tone: "draft" };
  if (status === "paid") return { key: "history.paidStamp", tone: "paid" };
  if (status === "voided") return { key: "history.voided", tone: "voided" };
  return null;
}

export function InvoiceDocument({
  invoice,
  company,
  client,
  lang = "en",
}: InvoiceDocumentProps) {
  const currency = invoice.currency;

  // Every distinct legal mention the lines carry, once each. A three-line
  // reverse-charged invoice states the article once, the way the PDF does —
  // repeating it per line would read as a rendering fault.
  const mentions = [
    ...new Set(
      invoice.lines
        .map((line) => line.vat?.legal_mention)
        .filter((mention): mention is string => Boolean(mention)),
    ),
  ];

  const discount = decimal(invoice.total_discount);
  const stamp = stampFor(invoice.status);

  return (
    <>
      {stamp ? (
        <span className={`bg-invdoc__stamp bg-invdoc__stamp--${stamp.tone}`}>
          {t(lang, stamp.key)}
        </span>
      ) : null}

      <div className="bg-invdoc__head">
        <div>
          <h3 className="bg-invdoc__kind">{t(lang, "invoiceDoc.title")}</h3>
          {/* A draft has no gapless number and must not display one — the
              absence is the honest signal that nothing has been consumed. */}
          {invoice.reference ? (
            <p className="bg-invdoc__ref">{invoice.reference}</p>
          ) : null}
        </div>
      </div>

      <div className="bg-invdoc__parties">
        {company ? (
          <AddressBlock
            label={t(lang, "invoiceDoc.from")}
            name={company.legal_name ?? company.name}
            vat={company.vat_number}
            lines={[
              company.address_line1,
              company.address_line2,
              [company.postal_code, company.city].filter(Boolean).join(" ") || null,
              company.country_code,
            ]}
          />
        ) : null}
        {client ? (
          <AddressBlock
            label={t(lang, "invoiceDoc.to")}
            name={client.name}
            vat={client.vat_number}
            // No `address_line2`: `Client` carries one in the domain model and
            // `ClientResponse` does not serve it, so the second line is on file
            // and unreachable here. It is a schema gap, not a layout choice —
            // the company block above prints both.
            lines={[
              client.address_line1,
              [client.postal_code, client.city].filter(Boolean).join(" ") || null,
              client.country_code,
            ]}
          />
        ) : null}
      </div>

      <dl className="bg-invdoc__dates">
        <div>
          <dt>{t(lang, "invoiceDoc.issueDate")}</dt>
          <dd>{formatDate(invoice.issue_date, lang)}</dd>
        </div>
        {invoice.due_date ? (
          <div>
            <dt>{t(lang, "invoiceDoc.dueDate")}</dt>
            <dd>{formatDate(invoice.due_date, lang)}</dd>
          </div>
        ) : null}
      </dl>

      <table className="bg-invdoc__table" aria-label={t(lang, "invoiceDoc.lines")}>
        <thead>
          <tr>
            <th>{t(lang, "invoiceDoc.description")}</th>
            <th className="bg-invdoc__num">{t(lang, "invoiceDoc.quantity")}</th>
            <th className="bg-invdoc__num">{t(lang, "invoiceDoc.unitPrice")}</th>
            <th className="bg-invdoc__num">{t(lang, "invoiceDoc.vat")}</th>
            <th className="bg-invdoc__num">{t(lang, "invoiceDoc.lineTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.line_number}>
              <td>{line.description}</td>
              <td className="bg-invdoc__num">{plain(line.quantity)}</td>
              <td className="bg-invdoc__num">
                {formatMoney(line.unit_price, currency, lang)}
              </td>
              <td className="bg-invdoc__num">{plain(line.vat?.rate)} %</td>
              <td className="bg-invdoc__num">
                {formatMoney(
                  decimal(line.quantity) * decimal(line.unit_price),
                  currency,
                  lang,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-invdoc__totals">
        <dl>
          <dt>{t(lang, "invoice.subtotal")}</dt>
          <dd>{formatMoney(invoice.subtotal_ht, currency, lang)}</dd>
          {discount > 0 ? (
            <>
              <dt>{t(lang, "invoice.discount")}</dt>
              <dd>−{formatMoney(invoice.total_discount, currency, lang)}</dd>
            </>
          ) : null}
          <dt>{t(lang, "invoice.vat")}</dt>
          <dd>{formatMoney(invoice.total_vat, currency, lang)}</dd>
          <div className="bg-invdoc__grand">
            <dt>{t(lang, "invoice.total")}</dt>
            <dd>{formatMoney(invoice.total_ttc, currency, lang)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-invdoc__foot">
        {/* The mentions come first: on a zero-rated invoice this sentence is
            what makes the document lawful, and it must not sit under the bank
            details as an afterthought. */}
        {mentions.map((mention) => (
          <p key={mention} className="bg-invdoc__mention">
            {mention}
          </p>
        ))}
        {invoice.payment_terms ? <p>{invoice.payment_terms}</p> : null}
        {company?.iban ? (
          <p>
            {t(lang, "invoiceDoc.payTo")} <span className="bg-num">{company.iban}</span>
            {company.bic ? <> · {company.bic}</> : null}
          </p>
        ) : null}
        {invoice.comments ? <p>{invoice.comments}</p> : null}
      </div>
    </>
  );
}
