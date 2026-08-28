/** One line item, edited away from the canvas (§5).
 *
 *  Scaffold — see README.md.
 *
 *  Quantity, unit, price, VAT, discount and a computed subtotal are six
 *  controls. Inline in a table they make every row a form and the invoice
 *  unreadable; in a drawer the table stays a table. The canvas keeps the four
 *  fields a user changes constantly and this owns the rest.
 *
 *  `productId` is cleared as soon as any catalog-derived field is edited. A
 *  line still claiming to be product X while quoting a different price is how
 *  a catalog report ends up summing something that was never sold.
 */

import { useState } from "react";
import { Button, Drawer, Field, Select, TextInput, Textarea } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { lineSubtotal } from "./totals";
import type { DraftLine } from "./types";

export interface VatRateOption {
  value: string;
  label: string;
}

export interface EditItemDrawerProps {
  open: boolean;
  line: DraftLine | null;
  currency: string;
  lang?: Lang;
  /** From `GET /vat-rates` — never a constant list maintained here. */
  vatRates: VatRateOption[];
  units?: string[];
  onClose: () => void;
  onChange: (line: DraftLine) => void;
  onRemove: (key: string) => void;
}

const DEFAULT_UNITS = ["unit", "hour", "day", "month", "project", "km"];

export function EditItemDrawer({
  open,
  line,
  currency,
  lang = "en",
  vatRates,
  units = DEFAULT_UNITS,
  onClose,
  onChange,
  onRemove,
}: EditItemDrawerProps) {
  // Keyed remount is the caller's job (`key={line?.key}`); this local copy
  // exists so a keystroke does not re-render the whole workspace.
  const [draft, setDraft] = useState<DraftLine | null>(line);
  const current = draft ?? line;

  if (!current) return null;

  function patch(changes: Partial<DraftLine>, breaksCatalogLink = false) {
    const next: DraftLine = {
      ...current!,
      ...changes,
      ...(breaksCatalogLink ? { productId: null } : {}),
    };
    setDraft(next);
    onChange(next);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Edit line item"
      footer={
        <>
          <Button variant="danger" onClick={() => onRemove(current.key)}>
            Remove item
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="bg-stack">
        <Field label="Description" htmlFor="line-description" required>
          <Textarea
            id="line-description"
            rows={3}
            value={current.description}
            onChange={(event) => patch({ description: event.target.value }, true)}
          />
        </Field>

        <div className="bg-ws-row">
          <Field label="Quantity" htmlFor="line-quantity">
            <TextInput
              id="line-quantity"
              inputMode="decimal"
              value={current.quantity}
              onChange={(event) => patch({ quantity: event.target.value })}
            />
          </Field>
          <Field label="Unit" htmlFor="line-unit">
            <Select
              id="line-unit"
              placeholder="—"
              options={units.map((unit) => ({ value: unit, label: unit }))}
              value={current.unit ?? ""}
              onChange={(event) => patch({ unit: event.target.value })}
            />
          </Field>
        </div>

        <div className="bg-ws-row">
          <Field label="Unit price" htmlFor="line-price">
            <TextInput
              id="line-price"
              inputMode="decimal"
              value={current.unitPrice}
              onChange={(event) => patch({ unitPrice: event.target.value }, true)}
            />
          </Field>
          <Field label="VAT" htmlFor="line-vat">
            <Select
              id="line-vat"
              options={vatRates}
              value={current.vatRate}
              onChange={(event) => patch({ vatRate: event.target.value }, true)}
            />
          </Field>
        </div>

        <Field
          label="Discount"
          htmlFor="line-discount"
          hint="Percentage applied to this line only."
        >
          <TextInput
            id="line-discount"
            inputMode="decimal"
            value={current.discountPercent ?? ""}
            onChange={(event) => patch({ discountPercent: event.target.value })}
          />
        </Field>

        <dl className="bg-totals">
          <div className="bg-totals__grand">
            <dt>Subtotal</dt>
            <dd className="bg-num">{formatMoney(lineSubtotal(current), currency, lang)}</dd>
          </div>
        </dl>
      </div>
    </Drawer>
  );
}
