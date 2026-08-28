/** Local barrel for the workspace scaffold.
 *
 *  **Deliberately not re-exported from `src/index.ts`.** Nothing in
 *  `frontend-saas` can import these yet, and that is the un-integrated state:
 *  the package's public surface is unchanged, so no route, no test and no
 *  bundle is affected by this directory existing.
 *
 *  Integrating means adding one line to `src/index.ts` per component the app
 *  actually mounts — not this whole file. See README.md.
 */

export { InvoiceWorkspace, type InvoiceWorkspaceProps } from "./InvoiceWorkspace";
export {
  InvoiceCustomerPicker,
  type CustomerOption,
  type InvoiceCustomerPickerProps,
} from "./InvoiceCustomerPicker";
export { CreateCustomerDrawer, type CreateCustomerDrawerProps } from "./CreateCustomerDrawer";
export {
  InvoiceItemsEditor,
  type CatalogItem,
  type InvoiceItemsEditorProps,
} from "./InvoiceItemsEditor";
export { EditItemDrawer, type EditItemDrawerProps, type VatRateOption } from "./EditItemDrawer";
export { InvoiceDetailsPanel, type InvoiceDetailsPanelProps } from "./InvoiceDetailsPanel";
export { InvoiceTotals, type InvoiceTotalsProps } from "./InvoiceTotals";
export { InvoiceReview, type InvoiceReviewProps } from "./InvoiceReview";
export { DeliveryPanel, type DeliveryPanelProps } from "./DeliveryPanel";
export {
  LiveInvoicePreview,
  type LiveInvoicePreviewProps,
  type PreviewCompany,
} from "./LiveInvoicePreview";

export { TemplateList, type TemplateListProps } from "./TemplateList";
export { TemplateWorkspace, type TemplateWorkspaceProps } from "./TemplateWorkspace";
export { BlockLibrary, type BlockLibraryProps } from "./BlockLibrary";
export { PropertyPanel, type PropertyPanelProps } from "./PropertyPanel";
export { AppearancePanel, type AppearancePanelProps } from "./AppearancePanel";

export { checkReadiness, isReady, type ReadinessItem, type ReadinessSeverity } from "./readiness";
export { computeTotals, lineSubtotal, type DraftTotals, type VatSummaryRow } from "./totals";
export { SAMPLES, sampleByKey, type SampleInvoice } from "./sampleInvoice";
export * from "./templateSchema";
export * from "./types";
export { BlockCanvas, type BlockCanvasProps } from "./BlockCanvas";
export { PresetGallery, type PresetGalleryProps } from "./PresetGallery";
export {
  DOC_KINDS,
  TEMPLATE_PRESETS,
  docTitle,
  presetByKey,
  templateFromPreset,
  type DocKind,
  type TemplatePreset,
} from "./templatePresets";
