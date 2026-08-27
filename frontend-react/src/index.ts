// Types (generated from the API's OpenAPI schema)
export * from "./types";

// HTTP client
export {
  ApiClient,
  ApiError,
  isEntitlementError,
  MemoryTokenStore,
  type ApiClientOptions,
  type EntitlementFailure,
  type RestoreReport,
  type Tokens,
  type TokenStore,
} from "./lib/apiClient";

// i18n & display formatting
export {
  t,
  tAuditAction,
  tFeature,
  tLevel,
  tMeter,
  tPeppolError,
  tSubscriptionStatus,
  tTier,
  type Lang,
  type MessageKey,
} from "./lib/translations";
export { formatDate, formatMoney, monthName } from "./lib/format";
export { documentFilename, saveBlob } from "./lib/download";

// Entitlement reading — presentation only; the server enforces with a 402.
export {
  featureGrade,
  featureValue,
  hasFeature,
  meterPercent,
  meterTone,
  meterUsage,
  type FeatureMap,
} from "./lib/entitlements";

// Providers & hooks
export { BillGenProvider, useApi } from "./providers/BillGenProvider";
export {
  EntitlementBoundary,
  type EntitlementBoundaryProps,
} from "./providers/EntitlementBoundary";
export { AuthProvider, useAuth, type Session } from "./hooks/useAuth";
export * from "./hooks/queries";

// Design system — the henrioutai component library, its own package.
// Re-exported so existing `import { Button } from "@billgen/ui"` sites keep
// working; the source of truth is @henrioutai/ui.
export * from "@henrioutai/ui";

// Information architecture — the single source of truth for nav, routes and
// which parts of the product actually have a server behind them.
export {
  IA,
  coverage,
  findByPath,
  flattenIa,
  iaFor,
  iaTrail,
  isNavDestination,
  missingEndpoints,
  navNodes,
  onSurface,
  routableNodes,
  type BackendStatus,
  type IaCoverage,
  type IaNode,
  type IaSection,
  type Layer,
  type Surface,
} from "./scaffold/ia";

// Scaffold kit — deliberately unstyled placeholders for unwired surface.
// Never use these for a feature that works; that is what @henrioutai/ui is for.
export {
  ScaffoldBadge,
  ScaffoldBlock,
  ScaffoldButton,
  ScaffoldField,
  ScaffoldHeading,
  ScaffoldMeter,
  ScaffoldNavDot,
  ScaffoldNote,
  ScaffoldPage,
  ScaffoldTable,
} from "./scaffold/Scaffold";

// Panels — BillGen business UI (data via hooks, no math here).
export { ActivityPanel } from "./panels/ActivityPanel";
export { BackupPanel } from "./panels/BackupPanel";
export { Client360Panel, type Client360PanelProps } from "./panels/Client360Panel";
export { ClientsPanel } from "./panels/ClientsPanel";
export { CompanyForm } from "./panels/CompanyForm";
export {
  CompanySettingsPanel,
  type CompanySection,
  type CompanySettingsPanelProps,
} from "./panels/CompanySettingsPanel";
export { CreditNotesPanel } from "./panels/CreditNotesPanel";
export { DashboardPanel } from "./panels/DashboardPanel";
export { HistoryPanel } from "./panels/HistoryPanel";
export {
  InvoiceDetailPanel,
  type InvoiceDetailPanelProps,
} from "./panels/InvoiceDetailPanel";
export { ImportPanel } from "./panels/ImportPanel";
export { InvoiceBuilderPanel } from "./panels/InvoiceBuilderPanel";
export { ProductsPanel } from "./panels/ProductsPanel";
export {
  ReceivablesPanel,
  type ReceivablesMode,
  type ReceivablesPanelProps,
} from "./panels/ReceivablesPanel";
export {
  MonthlyRevenueChart,
  RevenueReportPanel,
  type RevenueReportPanelProps,
} from "./panels/RevenueReportPanel";
export { FeatureValue, type FeatureValueProps } from "./panels/FeatureValue";
export { PlansPanel, type PlansPanelProps } from "./panels/PlansPanel";
export { UpgradeDialog, type UpgradeDialogProps } from "./panels/UpgradeDialog";
export { UsagePanel, type UsagePanelProps } from "./panels/UsagePanel";
export { VatReportPanel, type VatReportPanelProps } from "./panels/VatReportPanel";
