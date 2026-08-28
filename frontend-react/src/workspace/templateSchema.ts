/** The invoice template model — blocks, properties, appearance, versions.
 *
 *  Scaffold — see README.md. No endpoint serves or accepts this yet.
 *
 *  Three rules shape everything below, and each one is a refusal:
 *
 *  1. **No freeform positioning.** A template is an *ordered list of blocks*
 *     with typed properties, never x/y coordinates. A Canva-style canvas lets
 *     a user build a document that omits a legally required mention, and the
 *     PDF renderer in `core/pdf` is a Jinja template, not a layout engine —
 *     it could not honour arbitrary geometry even if we wanted it to.
 *
 *  2. **Appearance maps to semantic tokens, never to raw colour.** `brand`
 *     below carries token *names*, and the value a user picks becomes a token
 *     override. Raw hex in a template payload would reproduce, inside the
 *     database, exactly the bypass the palette guard exists to prevent.
 *
 *  3. **An issued invoice keeps the template it was issued with.**
 *     `TemplateVersion` is not a convenience for undo. Editing a template must
 *     not visually rewrite a document that has already been sent to a customer
 *     and possibly to a tax authority — so an invoice stores a *snapshot*, and
 *     the studio edits the draft that future invoices will use.
 *
 *  Rule 3 is the one that is expensive to add later and nearly free now, which
 *  is why the snapshot type exists in a file with no runtime behind it.
 */

export type BlockKind =
  | "header"
  | "parties"
  | "document_meta"
  | "items"
  | "totals"
  | "payment"
  | "notes"
  | "terms"
  | "footer";

export type Alignment = "start" | "center" | "end";
export type Density = "compact" | "comfortable" | "spacious";

export interface HeaderProperties {
  showLogo: boolean;
  showCompanyName: boolean;
  showCompanyContact: boolean;
  documentTitle: string;
  alignment: Alignment;
}

export interface PartiesProperties {
  showSellerAddress: boolean;
  showSellerVat: boolean;
  showCustomerVat: boolean;
  /** Which side of the page the customer block sits on. */
  customerAlignment: Alignment;
}

export type MetaField =
  | "reference"
  | "issue_date"
  | "due_date"
  | "customer_reference"
  | "payment_terms";

export interface DocumentMetaProperties {
  fields: MetaField[];
}

export type ItemColumn =
  | "description"
  | "quantity"
  | "unit"
  | "unit_price"
  | "discount"
  | "vat"
  | "total";

export interface ItemsProperties {
  /** Order *is* the array order; visibility is membership. Two facts, one field. */
  columns: ItemColumn[];
  decimals: 0 | 2 | 3;
  vatDisplay: "percentage" | "percentage_and_amount" | "amount";
  showLineDiscount: boolean;
}

export interface TotalsProperties {
  showSubtotal: boolean;
  showDiscount: boolean;
  /** Per-rate breakdown. Required the moment an invoice mixes rates. */
  showVatSummary: boolean;
  showAmountDue: boolean;
}

export interface PaymentProperties {
  showIban: boolean;
  showBic: boolean;
  showStructuredCommunication: boolean;
  showPaymentTerms: boolean;
  showQrCode: boolean;
}

export interface TextBlockProperties {
  /** Empty means "render nothing", not "render an empty box". */
  body: string;
}

export interface FooterProperties {
  body: string;
  showPageNumbers: boolean;
  /** Free-tier PDFs carry BillGen branding; the studio may not switch it off. */
  showBillGenBranding: boolean;
}

export type BlockProperties =
  | { kind: "header"; properties: HeaderProperties }
  | { kind: "parties"; properties: PartiesProperties }
  | { kind: "document_meta"; properties: DocumentMetaProperties }
  | { kind: "items"; properties: ItemsProperties }
  | { kind: "totals"; properties: TotalsProperties }
  | { kind: "payment"; properties: PaymentProperties }
  | { kind: "notes"; properties: TextBlockProperties }
  | { kind: "terms"; properties: TextBlockProperties }
  | { kind: "footer"; properties: FooterProperties };

export type TemplateBlock = BlockProperties & {
  id: string;
  /** Hidden blocks stay in the list so their properties survive a toggle. */
  visible: boolean;
};

export interface TemplateAppearance {
  brand: {
    /** ONE brand colour, as a hex value.
     *
     *  The scaffold refused this outright and offered three token names. That
     *  was too strict for a *document*: an invoice is the customer's own
     *  stationery, and a company that cannot put its colour on it will not use
     *  the studio. The app's chrome is a different question — the palette guard
     *  still forbids raw colour in component code, and this never reaches it.
     *
     *  What survives from that decision is the shape: exactly one colour, in
     *  one field, resolved into `--bg-brand` at render time. Not a hex per
     *  block, which is how a template becomes unreadable and un-reskinnable.
     */
    color: string;
    /** Still token names — these two carry legibility, not identity. */
    textToken: string;
    borderToken: string;
  };
  typography: {
    fontFamily: FontChoice;
    bodySizePt: number;
    headingSizePt: number;
  };
  page: {
    size: "A4" | "Letter";
    margins: "narrow" | "standard" | "wide";
    density: Density;
  };
}

/** Fonts a document may use.
 *
 *  Constrained to what the PDF renderer can actually draw. `core/pdf` renders
 *  through Chromium with two vendored faces (Satoshi, Geist Mono) and whatever
 *  the host has; everything else here is a family Chromium resolves on every
 *  platform BillGen targets. Offering a font the preview shows and the PDF
 *  silently substitutes is worse than offering six that always match.
 */
export type FontChoice =
  | "Satoshi"
  | "Geist Mono"
  | "Helvetica"
  | "Georgia"
  | "Times New Roman"
  | "Verdana";

export const FONT_CHOICES: readonly { value: FontChoice; label: string; stack: string }[] = [
  { value: "Satoshi", label: "Satoshi", stack: '"Satoshi", system-ui, sans-serif' },
  { value: "Helvetica", label: "Helvetica", stack: 'Helvetica, Arial, sans-serif' },
  { value: "Georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  { value: "Times New Roman", label: "Times", stack: '"Times New Roman", Times, serif' },
  { value: "Verdana", label: "Verdana", stack: 'Verdana, Geneva, sans-serif' },
  { value: "Geist Mono", label: "Geist Mono", stack: '"Geist Mono", ui-monospace, monospace' },
];

export function fontStack(choice: FontChoice): string {
  return FONT_CHOICES.find((f) => f.value === choice)?.stack ?? FONT_CHOICES[0].stack;
}

/** Brand colours offered as swatches, so the common case is one click.
 *
 *  A custom hex is still allowed — these are a starting point, not the whole
 *  range. Every one of them clears 4.5:1 against white, which is what keeps a
 *  document legible when it is printed rather than viewed.
 */
export const BRAND_SWATCHES: readonly { value: string; label: string }[] = [
  { value: "#0f766e", label: "Emerald" },
  { value: "#1d4ed8", label: "Blue" },
  { value: "#0f172a", label: "Ink" },
  { value: "#7c2d12", label: "Rust" },
  { value: "#6d28d9", label: "Violet" },
  { value: "#be123c", label: "Crimson" },
  { value: "#166534", label: "Forest" },
  { value: "#a16207", label: "Ochre" },
];

export interface InvoiceTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  blocks: TemplateBlock[];
  appearance: TemplateAppearance;
  publishedVersion: number;
  updatedAt: string;
}

/** What an issued invoice stores. Rule 3.
 *
 *  It carries the blocks and appearance *by value*, not the template id — an
 *  id would resolve to whatever the template says today, which is the exact
 *  failure this type prevents. `templateId` is kept only so the UI can say
 *  which template it came from.
 */
export interface TemplateSnapshot {
  templateId: string;
  templateName: string;
  version: number;
  takenAt: string;
  blocks: TemplateBlock[];
  appearance: TemplateAppearance;
}

/** Column headers as they print. Derived from the key with a regex instead,
 *  "vat" came out as "Vat" — a table heading that spells an acronym wrong on
 *  every invoice the customer receives. */
export const ITEM_COLUMN_LABELS: Record<ItemColumn, string> = {
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  unit_price: "Unit price",
  discount: "Discount",
  vat: "VAT",
  total: "Total",
};

export const BLOCK_LABELS: Record<BlockKind, string> = {
  header: "Header",
  parties: "Customer & seller",
  document_meta: "Invoice information",
  items: "Items",
  totals: "Totals",
  payment: "Payment",
  notes: "Notes",
  terms: "Terms & conditions",
  footer: "Footer",
};

/** Blocks an invoice cannot legally omit.
 *
 *  The studio renders these without a visibility toggle. Letting a user hide
 *  the parties block produces a document that is not an invoice, and BillGen
 *  would have handed them the tool to do it.
 */
export const REQUIRED_BLOCKS: readonly BlockKind[] = [
  "header",
  "parties",
  "document_meta",
  "items",
  "totals",
];

export function defaultAppearance(): TemplateAppearance {
  return {
    brand: {
      color: "#0f766e",
      textToken: "--bg-ink",
      borderToken: "--bg-line",
    },
    typography: { fontFamily: "Satoshi", bodySizePt: 10, headingSizePt: 24 },
    page: { size: "A4", margins: "standard", density: "comfortable" },
  };
}

export function defaultBlocks(): TemplateBlock[] {
  return [
    {
      id: "header",
      kind: "header",
      visible: true,
      properties: {
        showLogo: true,
        showCompanyName: true,
        showCompanyContact: true,
        documentTitle: "INVOICE",
        alignment: "start",
      },
    },
    {
      id: "parties",
      kind: "parties",
      visible: true,
      properties: {
        showSellerAddress: true,
        showSellerVat: true,
        showCustomerVat: true,
        customerAlignment: "end",
      },
    },
    {
      id: "document_meta",
      kind: "document_meta",
      visible: true,
      properties: { fields: ["reference", "issue_date", "due_date", "payment_terms"] },
    },
    {
      id: "items",
      kind: "items",
      visible: true,
      properties: {
        columns: ["description", "quantity", "unit_price", "vat", "total"],
        decimals: 2,
        vatDisplay: "percentage",
        showLineDiscount: false,
      },
    },
    {
      id: "totals",
      kind: "totals",
      visible: true,
      properties: {
        showSubtotal: true,
        showDiscount: true,
        showVatSummary: true,
        showAmountDue: true,
      },
    },
    {
      id: "payment",
      kind: "payment",
      visible: true,
      properties: {
        showIban: true,
        showBic: false,
        showStructuredCommunication: true,
        showPaymentTerms: true,
        showQrCode: false,
      },
    },
    { id: "notes", kind: "notes", visible: true, properties: { body: "" } },
    { id: "terms", kind: "terms", visible: false, properties: { body: "" } },
    {
      id: "footer",
      kind: "footer",
      visible: true,
      properties: { body: "", showPageNumbers: true, showBillGenBranding: true },
    },
  ];
}

export function defaultTemplate(id = "default", name = "Default invoice"): InvoiceTemplate {
  return {
    id,
    name,
    isDefault: true,
    blocks: defaultBlocks(),
    appearance: defaultAppearance(),
    publishedVersion: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function snapshot(template: InvoiceTemplate): TemplateSnapshot {
  return {
    templateId: template.id,
    templateName: template.name,
    version: template.publishedVersion,
    takenAt: new Date().toISOString(),
    blocks: structuredClone(template.blocks),
    appearance: structuredClone(template.appearance),
  };
}
