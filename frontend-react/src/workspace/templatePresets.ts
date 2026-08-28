/** Starter templates — the models offered before anyone edits anything.
 *
 *  A blank template studio is a wall. Nobody wants to assemble an invoice out
 *  of nine block types; they want one that already looks right and then to move
 *  two things. So the studio opens on these, and editing starts from a choice
 *  rather than from an empty document.
 *
 *  The five differ in ways a customer would actually notice — where the header
 *  sits, whether the VAT column is shown, how dense the lines are, serif vs
 *  sans — not in colour alone. Five colour variants of one layout would look
 *  like five options and behave like one.
 */

import {
  type BlockKind,
  type InvoiceTemplate,
  type TemplateAppearance,
  type TemplateBlock,
  defaultAppearance,
  defaultBlocks,
} from "./templateSchema";

export interface TemplatePreset {
  key: string;
  name: string;
  /** One line, shown under the name in the gallery. Says what is different. */
  tagline: string;
  appearance: TemplateAppearance;
  /** Which blocks this model shows. Everything else keeps its default. */
  visible: BlockKind[];
  /** Per-block property overrides, keyed by block id. */
  properties?: Record<string, Record<string, unknown>>;
}

const REQUIRED: BlockKind[] = ["header", "parties", "document_meta", "items", "totals"];

export const TEMPLATE_PRESETS: readonly TemplatePreset[] = [
  {
    key: "classic",
    name: "Classic",
    tagline: "Left-aligned header, full VAT column, payment terms in the footer.",
    appearance: {
      brand: { color: "#0f766e", textToken: "--bg-ink", borderToken: "--bg-line" },
      typography: { fontFamily: "Satoshi", bodySizePt: 10, headingSizePt: 24 },
      page: { size: "A4", margins: "standard", density: "comfortable" },
    },
    visible: [...REQUIRED, "payment", "footer"],
    properties: {
      header: { alignment: "start", documentTitle: "INVOICE" },
      items: { columns: ["description", "quantity", "unitPrice", "vat", "lineTotal"] },
    },
  },
  {
    key: "modern",
    name: "Modern",
    tagline: "Centred title, wide margins, no rules between lines.",
    appearance: {
      brand: { color: "#1d4ed8", textToken: "--bg-ink", borderToken: "--bg-line" },
      typography: { fontFamily: "Satoshi", bodySizePt: 10, headingSizePt: 30 },
      page: { size: "A4", margins: "wide", density: "spacious" },
    },
    visible: [...REQUIRED, "payment", "notes"],
    properties: {
      header: { alignment: "center", documentTitle: "Invoice" },
      items: { columns: ["description", "quantity", "unitPrice", "lineTotal"] },
    },
  },
  {
    key: "minimal",
    name: "Minimal",
    tagline: "No logo, no footer, the smallest document that is still legal.",
    appearance: {
      brand: { color: "#0f172a", textToken: "--bg-ink", borderToken: "--bg-line" },
      typography: { fontFamily: "Helvetica", bodySizePt: 9, headingSizePt: 18 },
      page: { size: "A4", margins: "narrow", density: "compact" },
    },
    visible: REQUIRED,
    properties: {
      header: { showLogo: false, alignment: "start", documentTitle: "INVOICE" },
      items: { columns: ["description", "quantity", "lineTotal"] },
    },
  },
  {
    key: "editorial",
    name: "Editorial",
    tagline: "Serif throughout. Reads like a letter rather than a receipt.",
    appearance: {
      brand: { color: "#7c2d12", textToken: "--bg-ink", borderToken: "--bg-line" },
      typography: { fontFamily: "Georgia", bodySizePt: 11, headingSizePt: 26 },
      page: { size: "A4", margins: "wide", density: "comfortable" },
    },
    visible: [...REQUIRED, "notes", "terms", "footer"],
    properties: {
      header: { alignment: "start", documentTitle: "Invoice" },
    },
  },
  {
    key: "dense",
    name: "Dense",
    tagline: "For long item lists. Fits roughly twice the lines on a page.",
    appearance: {
      brand: { color: "#166534", textToken: "--bg-ink", borderToken: "--bg-line" },
      typography: { fontFamily: "Verdana", bodySizePt: 8, headingSizePt: 16 },
      page: { size: "A4", margins: "narrow", density: "compact" },
    },
    visible: [...REQUIRED, "payment"],
    properties: {
      header: { alignment: "start", documentTitle: "INVOICE" },
      items: { columns: ["description", "quantity", "unitPrice", "vat", "lineTotal"] },
    },
  },
];

export function presetByKey(key: string): TemplatePreset {
  return TEMPLATE_PRESETS.find((preset) => preset.key === key) ?? TEMPLATE_PRESETS[0];
}

/** Build a template from a preset.
 *
 *  Starts from `defaultBlocks()` so every block keeps its full property set even
 *  when the preset hides it — the same reason the editor keeps hidden blocks in
 *  the list: a user who toggles Notes on and off should not lose what they
 *  typed.
 */
export function templateFromPreset(
  preset: TemplatePreset,
  overrides: Partial<Pick<InvoiceTemplate, "id" | "name" | "isDefault">> = {},
): InvoiceTemplate {
  const visible = new Set<BlockKind>(preset.visible);
  const blocks: TemplateBlock[] = defaultBlocks().map((block) => {
    const extra = preset.properties?.[block.id] ?? {};
    return {
      ...block,
      visible: visible.has(block.kind),
      properties: { ...block.properties, ...extra },
    } as TemplateBlock;
  });

  return {
    id: overrides.id ?? `template-${preset.key}`,
    name: overrides.name ?? preset.name,
    isDefault: overrides.isDefault ?? false,
    blocks,
    appearance: preset.appearance,
    publishedVersion: 0,
    updatedAt: new Date().toISOString(),
  };
}

export { defaultAppearance };
