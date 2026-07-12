// Types (generated from the API's OpenAPI schema)
export * from "./types";

// HTTP client
export {
  ApiClient,
  ApiError,
  MemoryTokenStore,
  type ApiClientOptions,
  type RestoreReport,
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
export { Button, type ButtonProps } from "./components/Button";
export { Spinner } from "./components/Spinner";
export { IconButton, type IconButtonProps } from "./components/IconButton";
export { LogoMark, type LogoMarkProps } from "./components/LogoMark";
export { HomeButton, type HomeButtonProps } from "./components/HomeButton";
export { CreateBillButton, type CreateBillButtonProps } from "./components/CreateBillButton";
export { TopNav, type TopNavProps, type TopNavLink } from "./components/TopNav";
export { LoadingScreen, type LoadingScreenProps } from "./components/LoadingScreen";
export * from "./components/icons";
export { Card, type CardProps } from "./components/Card";
export { PageHeader, type PageHeaderProps } from "./components/PageHeader";
export { Field, type FieldProps } from "./components/Field";
export { TextInput, type TextInputProps } from "./components/TextInput";
export { Textarea, type TextareaProps } from "./components/Textarea";
export { Select, type SelectProps, type SelectOption } from "./components/Select";
export { Checkbox, type CheckboxProps } from "./components/Checkbox";
export { RadioGroup, type RadioGroupProps, type RadioOption } from "./components/RadioGroup";
export { Switch, type SwitchProps } from "./components/Switch";
export { SearchBar, type SearchBarProps } from "./components/SearchBar";
export { Modal, type ModalProps } from "./components/Modal";
export { ConfirmDialog, type ConfirmDialogProps } from "./components/ConfirmDialog";
export { Banner, type BannerProps } from "./components/Banner";
export { Toast, ToastStack, type ToastProps, type ToastStackProps } from "./components/Toast";
export { EmptyState, type EmptyStateProps } from "./components/EmptyState";
export { ErrorState, type ErrorStateProps } from "./components/ErrorState";
export { ProgressBar, type ProgressBarProps } from "./components/ProgressBar";
export {
  Table,
  type TableProps,
  type TableColumn,
  type TableSort,
  type SortDirection,
} from "./components/Table";
export { List, type ListProps, type ListItemData } from "./components/List";
export { Badge, type BadgeProps, type BadgeTone, type InvoiceStatus } from "./components/Badge";
export { Tooltip, type TooltipProps } from "./components/Tooltip";
export { Skeleton, type SkeletonProps } from "./components/Skeleton";
export {
  Menu,
  type MenuProps,
  type MenuEntry,
  type MenuItemData,
  type MenuSeparator,
} from "./components/Menu";
export { AccountMenu, type AccountMenuProps } from "./components/AccountMenu";
export { AppShell, type AppShellProps } from "./components/AppShell";
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbItem } from "./components/Breadcrumbs";
export { Tabs, type TabsProps, type TabItem } from "./components/Tabs";
export { Pagination, type PaginationProps } from "./components/Pagination";
export { KpiCard, type KpiCardProps, type KpiDelta } from "./components/KpiCard";
export { Avatar, type AvatarProps } from "./components/Avatar";
export { Combobox, type ComboboxProps, type ComboboxOption } from "./components/Combobox";
export { DatePicker, type DatePickerProps } from "./components/DatePicker";
export { FileUpload, type FileUploadProps } from "./components/FileUpload";
export { Drawer, type DrawerProps } from "./components/Drawer";
export { Stepper, type StepperProps, type StepItem } from "./components/Stepper";
export {
  StatusTimeline,
  type StatusTimelineProps,
  type TimelineItem,
  type TimelineStatus,
} from "./components/StatusTimeline";
export {
  CommandPalette,
  type CommandPaletteProps,
  type CommandItem,
} from "./components/CommandPalette";
export { Segmented, type SegmentedProps, type SegmentedOption } from "./components/Segmented";
export { ThemeSwitcher, type ThemeSwitcherProps, type ThemeValue } from "./components/ThemeSwitcher";
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
  type LanguageOption,
} from "./components/LanguageSwitcher";
export {
  SettingsShell,
  type SettingsShellProps,
  type SettingsSection,
} from "./components/SettingsShell";
export {
  NotificationCenter,
  type NotificationCenterProps,
  type NotificationItem,
} from "./components/NotificationCenter";
export { SuccessState, type SuccessStateProps } from "./components/SuccessState";
export { Kbd, type KbdProps } from "./components/Kbd";
export { CopyButton, type CopyButtonProps } from "./components/CopyButton";
export { ContextMenu, type ContextMenuProps } from "./components/ContextMenu";
export { OrgSwitcher, type OrgSwitcherProps, type OrgItem } from "./components/OrgSwitcher";
export { HelpBubble, type HelpBubbleProps, type HelpLink } from "./components/HelpBubble";
export {
  ChartWrapper,
  type ChartWrapperProps,
  type ChartLegendItem,
} from "./components/ChartWrapper";
export { Divider, type DividerProps } from "./components/Divider";

// Panels
export { ActivityPanel } from "./panels/ActivityPanel";
export { BackupPanel } from "./panels/BackupPanel";
export { ClientsPanel } from "./panels/ClientsPanel";
export { CompanyForm } from "./panels/CompanyForm";
export { DashboardPanel } from "./panels/DashboardPanel";
export { HistoryPanel } from "./panels/HistoryPanel";
export { ImportPanel } from "./panels/ImportPanel";
export { InvoiceBuilderPanel } from "./panels/InvoiceBuilderPanel";
export { ProductsPanel } from "./panels/ProductsPanel";
