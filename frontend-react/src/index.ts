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

// i18n
export { t, type Lang, type MessageKey } from "./lib/translations";

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
export { ClientsPanel } from "./panels/ClientsPanel";
