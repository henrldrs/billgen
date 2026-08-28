/** The right rail: properties of whichever block is selected (§16).
 *
 *  Scaffold — see README.md.
 *
 *  One `switch` over `block.kind`, and TypeScript's discriminated union does
 *  the rest — each branch sees only the properties its own block has. That is
 *  the reason `BlockProperties` in `templateSchema.ts` is a union rather than
 *  an object with every field optional: an editor over optional fields will
 *  eventually render a "VAT display" control on a footer.
 *
 *  The items block gets the most attention because it is the block users
 *  actually want to change: which columns, in what order.
 */

import { Checkbox, Field, RadioGroup, Segmented, Select, Textarea } from "@henrioutai/ui";

import {
  BLOCK_LABELS,
  ITEM_COLUMN_LABELS,
  type ItemColumn,
  type TemplateBlock,
} from "./templateSchema";

export interface PropertyPanelProps {
  block: TemplateBlock | null;
  onChange: (block: TemplateBlock) => void;
}

const ALL_COLUMNS: ItemColumn[] = [
  "description",
  "quantity",
  "unit",
  "unit_price",
  "discount",
  "vat",
  "total",
];

export function PropertyPanel({ block, onChange }: PropertyPanelProps) {
  if (!block) {
    return <p className="bg-ws-note">Select a block in the document to edit it.</p>;
  }

  function update(next: TemplateBlock) {
    onChange(next);
  }

  return (
    <div className="bg-stack">
      <h3>{BLOCK_LABELS[block.kind]}</h3>
      {renderProperties(block, update)}
    </div>
  );
}

function renderProperties(block: TemplateBlock, update: (next: TemplateBlock) => void) {
  switch (block.kind) {
    case "header": {
      const properties = block.properties;
      return (
        <>
          <Checkbox
            label="Show logo"
            checked={properties.showLogo}
            onChange={(event) =>
              update({ ...block, properties: { ...properties, showLogo: event.target.checked } })
            }
          />
          <Checkbox
            label="Show company name"
            checked={properties.showCompanyName}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showCompanyName: event.target.checked },
              })
            }
          />
          <Field label="Alignment" htmlFor="header-alignment">
            <Segmented
              ariaLabel="Header alignment"
              value={properties.alignment}
              onChange={(alignment) => update({ ...block, properties: { ...properties, alignment } })}
              options={[
                { value: "start", label: "Left" },
                { value: "center", label: "Center" },
                { value: "end", label: "Right" },
              ]}
            />
          </Field>
        </>
      );
    }

    case "parties": {
      const properties = block.properties;
      return (
        <>
          <Checkbox
            label="Show our VAT number"
            checked={properties.showSellerVat}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showSellerVat: event.target.checked },
              })
            }
          />
          <Checkbox
            label="Show customer VAT number"
            hint="Required whenever the invoice is reverse-charged."
            checked={properties.showCustomerVat}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showCustomerVat: event.target.checked },
              })
            }
          />
        </>
      );
    }

    case "items": {
      const properties = block.properties;
      return (
        <>
          <Field label="Visible columns" htmlFor="items-columns">
            <div className="bg-stack">
              {ALL_COLUMNS.map((column) => (
                <Checkbox
                  key={column}
                  label={ITEM_COLUMN_LABELS[column]}
                  // Description carries the line itself. A table of prices with
                  // no descriptions is not an invoice anyone can check.
                  disabled={column === "description"}
                  checked={properties.columns.includes(column)}
                  onChange={(event) =>
                    update({
                      ...block,
                      properties: {
                        ...properties,
                        columns: event.target.checked
                          ? ALL_COLUMNS.filter(
                              (candidate) =>
                                candidate === column || properties.columns.includes(candidate),
                            )
                          : properties.columns.filter((candidate) => candidate !== column),
                      },
                    })
                  }
                />
              ))}
            </div>
          </Field>

          <Field label="VAT display" htmlFor="items-vat-display">
            <RadioGroup
              name="items-vat-display"
              value={properties.vatDisplay}
              onChange={(value) =>
                update({
                  ...block,
                  properties: {
                    ...properties,
                    vatDisplay: value as typeof properties.vatDisplay,
                  },
                })
              }
              options={[
                { value: "percentage", label: "Percentage" },
                { value: "percentage_and_amount", label: "Percentage + amount" },
                { value: "amount", label: "Amount only" },
              ]}
            />
          </Field>

          <Field label="Decimals" htmlFor="items-decimals">
            <Select
              id="items-decimals"
              value={String(properties.decimals)}
              options={[
                { value: "0", label: "0" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
              onChange={(event) =>
                update({
                  ...block,
                  properties: {
                    ...properties,
                    decimals: Number(event.target.value) as 0 | 2 | 3,
                  },
                })
              }
            />
          </Field>
        </>
      );
    }

    case "totals": {
      const properties = block.properties;
      return (
        <>
          <Checkbox
            label="Show subtotal"
            checked={properties.showSubtotal}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showSubtotal: event.target.checked },
              })
            }
          />
          <Checkbox
            label="Show VAT summary"
            hint="Per-rate breakdown. Leave on — it is required as soon as an invoice mixes rates."
            checked={properties.showVatSummary}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showVatSummary: event.target.checked },
              })
            }
          />
          <Checkbox
            label="Show amount due"
            checked={properties.showAmountDue}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showAmountDue: event.target.checked },
              })
            }
          />
        </>
      );
    }

    case "payment": {
      const properties = block.properties;
      return (
        <>
          <Checkbox
            label="Show IBAN"
            checked={properties.showIban}
            onChange={(event) =>
              update({ ...block, properties: { ...properties, showIban: event.target.checked } })
            }
          />
          <Checkbox
            label="Show BIC"
            checked={properties.showBic}
            onChange={(event) =>
              update({ ...block, properties: { ...properties, showBic: event.target.checked } })
            }
          />
          <Checkbox
            label="Show structured communication"
            checked={properties.showStructuredCommunication}
            onChange={(event) =>
              update({
                ...block,
                properties: {
                  ...properties,
                  showStructuredCommunication: event.target.checked,
                },
              })
            }
          />
        </>
      );
    }

    case "document_meta":
      return <p className="bg-ws-note">Fields are chosen by the document&rsquo;s language pack.</p>;

    case "notes":
    case "terms": {
      const properties = block.properties;
      return (
        <Field label="Default text" htmlFor="block-body">
          <Textarea
            id="block-body"
            rows={5}
            value={properties.body}
            onChange={(event) =>
              update({ ...block, properties: { ...properties, body: event.target.value } })
            }
          />
        </Field>
      );
    }

    case "footer": {
      const properties = block.properties;
      return (
        <>
          <Field label="Footer text" htmlFor="footer-body">
            <Textarea
              id="footer-body"
              rows={3}
              value={properties.body}
              onChange={(event) =>
                update({ ...block, properties: { ...properties, body: event.target.value } })
              }
            />
          </Field>
          <Checkbox
            label="Page numbers"
            checked={properties.showPageNumbers}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showPageNumbers: event.target.checked },
              })
            }
          />
          <Checkbox
            label="BillGen branding"
            hint="Required on the free tier — the toggle is here so paid plans can turn it off."
            checked={properties.showBillGenBranding}
            onChange={(event) =>
              update({
                ...block,
                properties: { ...properties, showBillGenBranding: event.target.checked },
              })
            }
          />
        </>
      );
    }
  }
}
