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
  tVatReason,
  type Lang,
  type MessageKey,
  LANGS,
  hasMessage,
  isLang,
  tf,
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
  LanguageProvider,
  useLang,
  type LanguageProviderProps,
} from "./providers/LanguageProvider";
export { LanguageToggle, type LanguageToggleProps } from "./panels/LanguageToggle";
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
  MVP_SURFACE,
  alertsOffered,
  coverage,
  findByPath,
  flattenIa,
  iaFor,
  iaTrail,
  isExposed,
  isNavDestination,
  missingEndpoints,
  navNodes,
  onSurface,
  routableNodes,
  type BackendStatus,
  type Exposure,
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
export { AccountPanel, type AccountPanelProps } from "./panels/AccountPanel";
export { ActivityPanel } from "./panels/ActivityPanel";
export { AlertsPanel, alertSentence, type AlertsPanelProps } from "./panels/AlertsPanel";
export { AppearancePanel, type AppearancePanelProps } from "./panels/AppearancePanel";
export { BackupPanel } from "./panels/BackupPanel";
export { DataPrivacyPanel, type DataPrivacyPanelProps } from "./panels/DataPrivacyPanel";
export { Client360Panel, type Client360PanelProps } from "./panels/Client360Panel";
export { ClientsPanel } from "./panels/ClientsPanel";
export { CompanyForm } from "./panels/CompanyForm";
export { OnboardingWizard, type OnboardingWizardProps } from "./panels/OnboardingWizard";
export { FirstRunGate, type FirstRunGateProps } from "./shell/FirstRunGate";
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
export { ProductsPanel, type ProductsPanelProps } from "./panels/ProductsPanel";
export {
  InvoicesReportPanel,
  type InvoicesReportPanelProps,
} from "./panels/InvoicesReportPanel";
export {
  usePeriodPicker,
  type PeriodPickerOptions,
} from "./panels/PeriodPicker";
export {
  PaymentsReportPanel,
  type PaymentsReportPanelProps,
} from "./panels/PaymentsReportPanel";
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

// Template studio (catalog/templates). The invoice *composer* in the same
// directory stays unexported: its shape is still under discussion, and an
// export is what makes a component reachable enough to be wired by accident.
export { TemplateWorkspace, type TemplateWorkspaceProps } from "./workspace/TemplateWorkspace";
export { TemplateList, type TemplateListProps } from "./workspace/TemplateList";
export { PresetGallery, type PresetGalleryProps } from "./workspace/PresetGallery";
export { defaultTemplate, type InvoiceTemplate, type TemplateAppearance, type TemplateBlock } from "./workspace/templateSchema";
export {
  DOC_KINDS,
  TEMPLATE_PRESETS,
  docTitle,
  templateFromPreset,
  type DocKind,
  type TemplatePreset,
} from "./workspace/templatePresets";
