/** Live totals, and the per-rate VAT summary (§7).
 *
 *  Scaffold — see README.md.
 *
 *  The summary is not decoration. An invoice that mixes rates has to state the
 *  taxable base per rate, so the block appears automatically the moment a
 *  second rate exists and cannot be switched off from here — that switch lives
 *  in the template, where it is a `showVatSummary` property with the same
 *  constraint written next to it.
 */

import { Divider } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import type { DraftTotals } from "./totals";

export interface InvoiceTotalsProps {
  totals: DraftTotals;
  currency: string;
  lang?: Lang;
  /** Rendered under the total — "Amount due", a deposit line, a mention. */
  footnote?: string;
}

export function InvoiceTotals({ totals, currency, lang = "en", footnote }: InvoiceTotalsProps) {
  const multiRate = totals.vatSummary.length > 1;

  return (
    <div className="bg-ws-totals">
      <dl className="bg-totals">
        <div>
          <dt>Subtotal</dt>
          <dd className="bg-num">{formatMoney(totals.subtotal, currency, lang)}</dd>
        </div>
        {totals.discount > 0 && (
          <div>
            <dt>Discount</dt>
            <dd className="bg-num">−{formatMoney(totals.discount, currency, lang)}</dd>
          </div>
        )}
        {!multiRate && (
          <div>
            <dt>VAT{totals.vatSummary[0] ? ` ${totals.vatSummary[0].rate}%` : ""}</dt>
            <dd className="bg-num">{formatMoney(totals.vat, currency, lang)}</dd>
          </div>
        )}
        <div className="bg-totals__grand">
          <dt>Total</dt>
          <dd className="bg-num">{formatMoney(totals.total, currency, lang)}</dd>
        </div>
      </dl>

      {multiRate && (
        <>
          <Divider label="VAT summary" />
          <table className="bg-ws-vat-summary">
            <thead>
              <tr>
                <th scope="col">Rate</th>
                <th scope="col">Base</th>
                <th scope="col">VAT</th>
              </tr>
            </thead>
            <tbody>
              {totals.vatSummary.map((row) => (
                <tr key={row.rate}>
                  <td>{row.rate}%</td>
                  <td className="bg-num">{formatMoney(row.base, currency, lang)}</td>
                  <td className="bg-num">{formatMoney(row.vat, currency, lang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total VAT</td>
                <td />
                <td className="bg-num">{formatMoney(totals.vat, currency, lang)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {footnote && <p className="bg-ws-footnote">{footnote}</p>}
    </div>
  );
}
