/** The document preview — one renderer, used by the composer and the studio.
 *
 *  Scaffold — see README.md.
 *
 *  **This is an approximation, and the UI must say so.** The binding PDF comes
 *  from `core/pdf` (Jinja + headless Chromium) and this is HTML in a browser;
 *  fonts hint differently, a page break falls somewhere else, and no amount of
 *  care makes the two identical. The blueprint asks for a preview that is
 *  "real, not a decorative mock" — real means driven by the actual draft and
 *  the actual template blocks, which this is. It does not mean pixel-exact,
 *  and a product that implies otherwise gets support tickets about kerning.
 *
 *  The composer and the Template Studio share it deliberately. Two renderers
 *  drift, and the day they do is the day a user designs a template against a
 *  preview that the composer draws differently.
 */

import { formatDate, formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { computeTotals } from "./totals";
import type { InvoiceDraft } from "./types";
import { ITEM_COLUMN_LABELS } from "./templateSchema";
import type { InvoiceTemplate, TemplateBlock, TemplateSnapshot } from "./templateSchema";

export interface PreviewCompany {
  name: string;
  vatNumber?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
}

export interface LiveInvoicePreviewProps {
  draft: InvoiceDraft;
  company: PreviewCompany;
  /** A template being edited, or the snapshot an issued invoice carries. */
  template: InvoiceTemplate | TemplateSnapshot;
  lang?: Lang;
  invoiceDiscountPercent?: string;
  /** Which block the studio has selected, if any — draws the selection ring. */
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}

function addressLines(party: {
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}): string[] {
  return [
    party.addressLine,
    [party.postalCode, party.city].filter(Boolean).join(" ") || undefined,
    party.country,
  ].filter((line): line is string => Boolean(line));
}

export function LiveInvoicePreview({
  draft,
  company,
  template,
  lang = "en",
  invoiceDiscountPercent = "0",
  selectedBlockId = null,
  onSelectBlock,
}: LiveInvoicePreviewProps) {
  const totals = computeTotals(draft.lines, invoiceDiscountPercent);
  const currency = draft.currency;
  const density = template.appearance.page.density;

  function renderBlock(block: TemplateBlock) {
    switch (block.kind) {
      case "header":
        return (
          <header className={`bg-doc__header bg-doc__header--${block.properties.alignment}`}>
            {block.properties.showLogo && company.logoUrl && (
              <img className="bg-doc__logo" src={company.logoUrl} alt="" />
            )}
            {block.properties.showCompanyName && <p className="bg-doc__brand">{company.name}</p>}
            <h1 className="bg-doc__title">{block.properties.documentTitle}</h1>
          </header>
        );

      case "parties":
        return (
          <div className="bg-doc__parties">
            <address>
              <strong>{company.name}</strong>
              {addressLines(company).map((line) => (
                <span key={line}>{line}</span>
              ))}
              {block.properties.showSellerVat && company.vatNumber && (
                <span className="bg-num">{company.vatNumber}</span>
              )}
            </address>
            <address className={`bg-doc__customer bg-doc__customer--${block.properties.customerAlignment}`}>
              <strong>{draft.customer?.name ?? "—"}</strong>
              {draft.customer && addressLines(draft.customer).map((line) => (
                <span key={line}>{line}</span>
              ))}
              {block.properties.showCustomerVat && draft.customer?.vatNumber && (
                <span className="bg-num">{draft.customer.vatNumber}</span>
              )}
            </address>
          </div>
        );

      case "document_meta":
        return (
          <dl className="bg-doc__meta">
            {block.properties.fields.map((field) => {
              const value =
                field === "reference"
                  ? draft.reference ?? "—"
                  : field === "issue_date"
                    ? draft.issueDate && formatDate(draft.issueDate, lang)
                    : field === "due_date"
                      ? draft.dueDate && formatDate(draft.dueDate, lang)
                      : field === "customer_reference"
                        ? draft.references.customerReference
                        : draft.payment.termsDays !== undefined
                          ? `${draft.payment.termsDays} days`
                          : undefined;
              return (
                <div key={field}>
                  <dt>{field.replace(/_/g, " ")}</dt>
                  <dd className="bg-num">{value || "—"}</dd>
                </div>
              );
            })}
          </dl>
        );

      case "items":
        return (
          <table className="bg-doc__items">
            <thead>
              <tr>
                {block.properties.columns.map((column) => (
                  <th key={column} scope="col">
                    {ITEM_COLUMN_LABELS[column]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line) => (
                <tr key={line.key}>
                  {block.properties.columns.map((column) => {
                    switch (column) {
                      case "description":
                        return <td key={column}>{line.description}</td>;
                      case "quantity":
                        return (
                          <td key={column} className="bg-num">
                            {line.quantity}
                          </td>
                        );
                      case "unit":
                        return <td key={column}>{line.unit ?? "—"}</td>;
                      case "unit_price":
                        return (
                          <td key={column} className="bg-num">
                            {formatMoney(line.unitPrice, currency, lang)}
                          </td>
                        );
                      case "discount":
                        return (
                          <td key={column} className="bg-num">
                            {line.discountPercent ? `${line.discountPercent}%` : "—"}
                          </td>
                        );
                      case "vat":
                        return (
                          <td key={column} className="bg-num">
                            {block.properties.vatDisplay === "amount"
                              ? formatMoney(
                                  Number(line.quantity) *
                                    Number(line.unitPrice) *
                                    (Number(line.vatRate) / 100),
                                  currency,
                                  lang,
                                )
                              : `${line.vatRate}%`}
                          </td>
                        );
                      case "total":
                        return (
                          <td key={column} className="bg-num">
                            {formatMoney(
                              Number(line.quantity) * Number(line.unitPrice),
                              currency,
                              lang,
                            )}
                          </td>
                        );
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "totals":
        return (
          <dl className="bg-doc__totals">
            {block.properties.showSubtotal && (
              <div>
                <dt>Subtotal</dt>
                <dd className="bg-num">{formatMoney(totals.subtotal, currency, lang)}</dd>
              </div>
            )}
            {block.properties.showDiscount && totals.discount > 0 && (
              <div>
                <dt>Discount</dt>
                <dd className="bg-num">−{formatMoney(totals.discount, currency, lang)}</dd>
              </div>
            )}
            {block.properties.showVatSummary &&
              totals.vatSummary.map((row) => (
                <div key={row.rate}>
                  <dt>VAT {row.rate}%</dt>
                  <dd className="bg-num">{formatMoney(row.vat, currency, lang)}</dd>
                </div>
              ))}
            <div className="bg-doc__grand">
              <dt>Total</dt>
              <dd className="bg-num">{formatMoney(totals.total, currency, lang)}</dd>
            </div>
          </dl>
        );

      case "payment":
        return (
          <dl className="bg-doc__payment">
            {block.properties.showIban && draft.payment.iban && (
              <div>
                <dt>IBAN</dt>
                <dd className="bg-num">{draft.payment.iban}</dd>
              </div>
            )}
            {block.properties.showBic && draft.payment.bic && (
              <div>
                <dt>BIC</dt>
                <dd className="bg-num">{draft.payment.bic}</dd>
              </div>
            )}
            {block.properties.showStructuredCommunication &&
              draft.payment.structuredCommunication && (
                <div>
                  <dt>Communication</dt>
                  <dd className="bg-num">{draft.payment.structuredCommunication}</dd>
                </div>
              )}
          </dl>
        );

      case "notes":
        return draft.notes ? <p className="bg-doc__notes">{draft.notes}</p> : null;

      case "terms":
        return draft.terms || block.properties.body ? (
          <p className="bg-doc__terms">{draft.terms || block.properties.body}</p>
        ) : null;

      case "footer":
        return (
          <footer className="bg-doc__footer">
            {block.properties.body && <p>{block.properties.body}</p>}
            {block.properties.showBillGenBranding && <p>Created with BillGen</p>}
          </footer>
        );
    }
  }

  return (
    <div className={`bg-doc bg-doc--${density}`} data-page={template.appearance.page.size}>
      {template.blocks
        .filter((block) => block.visible)
        .map((block) => (
          <div
            key={block.id}
            className={
              selectedBlockId === block.id ? "bg-doc__block bg-doc__block--selected" : "bg-doc__block"
            }
            onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
          >
            {renderBlock(block)}
          </div>
        ))}
      <p className="bg-doc__disclaimer">
        Approximate preview. The issued PDF is rendered server-side and is the binding document.
      </p>
    </div>
  );
}
