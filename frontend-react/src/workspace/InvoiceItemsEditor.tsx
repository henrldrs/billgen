/** The line-item table (§4) — typing, catalog suggestions, row actions.
 *
 *  Scaffold — see README.md.
 *
 *  The catalog is a *suggestion*, never a constraint. Picking "Website
 *  development" fills description, price and VAT, and every one of them stays
 *  editable — a composer that locks a catalog price is a composer people stop
 *  using the moment they discount something.
 *
 *  Free-text lines are first-class for the same reason. `GET /reports/products`
 *  already counts them, and it says so, precisely because pretending every
 *  line came from the catalog would make that report quietly wrong.
 */

import { Button, Combobox, Table, type TableColumn } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { lineSubtotal } from "./totals";
import { emptyLine, type DraftLine } from "./types";

export interface CatalogItem {
  id: string;
  name: string;
  unitPrice: string;
  vatRate: string;
  unit?: string;
}

export interface InvoiceItemsEditorProps {
  lines: DraftLine[];
  currency: string;
  lang?: Lang;
  catalog: CatalogItem[];
  onChange: (lines: DraftLine[]) => void;
  onEditLine: (key: string) => void;
}

export function InvoiceItemsEditor({
  lines,
  currency,
  lang = "en",
  catalog,
  onChange,
  onEditLine,
}: InvoiceItemsEditorProps) {
  function addBlank() {
    onChange([...lines, emptyLine()]);
  }

  function addFromCatalog(productId: string | null) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    onChange([
      ...lines,
      {
        ...emptyLine(),
        description: product.name,
        unitPrice: product.unitPrice,
        vatRate: product.vatRate,
        unit: product.unit,
        productId: product.id,
      },
    ]);
  }

  const columns: TableColumn<DraftLine>[] = [
    {
      key: "description",
      label: "Description",
      render: (line) => (
        <button type="button" className="bg-linkish" onClick={() => onEditLine(line.key)}>
          {line.description || <em>Untitled line</em>}
        </button>
      ),
    },
    { key: "quantity", label: "Qty", numeric: true, width: "6rem" },
    {
      key: "unitPrice",
      label: "Unit price",
      numeric: true,
      width: "9rem",
      render: (line) => formatMoney(line.unitPrice, currency, lang),
    },
    {
      key: "vatRate",
      label: "VAT",
      numeric: true,
      width: "5rem",
      render: (line) => `${line.vatRate}%`,
    },
    {
      key: "total",
      label: "Total",
      numeric: true,
      width: "9rem",
      render: (line) => formatMoney(lineSubtotal(line), currency, lang),
    },
  ];

  return (
    <div className="bg-ws-items">
      <Table
        columns={columns}
        rows={lines}
        rowKey={(line) => line.key}
        onRowClick={(line) => onEditLine(line.key)}
        empty={<span>No items yet. Add one, or pick something from the catalog.</span>}
      />

      <div className="bg-ws-items__actions">
        <Button variant="secondary" size="sm" onClick={addBlank}>
          + Add item
        </Button>
        <Combobox
          options={catalog.map((item) => ({
            value: item.id,
            label: item.name,
            hint: formatMoney(item.unitPrice, currency, lang),
          }))}
          value={null}
          onChange={addFromCatalog}
          placeholder="+ Add from catalog"
          emptyText="Nothing in the catalog matches."
        />
      </div>
    </div>
  );
}
