// Types (generated from the API's OpenAPI schema)
export * from "./types";

// HTTP client
export {
  ApiClient,
  ApiError,
  MemoryTokenStore,
  type ApiClientOptions,
  type Tokens,
  type TokenStore,
} from "./lib/apiClient";

// i18n & display formatting
export { t, type Lang, type MessageKey } from "./lib/translations";
export { formatDate, formatMoney, monthName } from "./lib/format";

// Providers & hooks
export { BillGenProvider, useApi } from "./providers/BillGenProvider";
export { AuthProvider, useAuth, type Session } from "./hooks/useAuth";
export * from "./hooks/queries";

// Components
export { Button } from "./components/Button";
export { EmptyState } from "./components/EmptyState";
export { Field } from "./components/Field";
export { Modal } from "./components/Modal";
export { Spinner } from "./components/Spinner";

// Panels
export { ActivityPanel } from "./panels/ActivityPanel";
export { ClientsPanel } from "./panels/ClientsPanel";
export { CompanyForm } from "./panels/CompanyForm";
export { DashboardPanel } from "./panels/DashboardPanel";
export { HistoryPanel } from "./panels/HistoryPanel";
export { ImportPanel } from "./panels/ImportPanel";
export { InvoiceBuilderPanel } from "./panels/InvoiceBuilderPanel";
export { ProductsPanel } from "./panels/ProductsPanel";
