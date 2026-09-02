export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'sent'
  | 'delivered'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'voided';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';

export type CreditNoteStatus = 'draft' | 'validated' | 'refunded';

export type PeppolStatus = 'not_sent' | 'sending' | 'delivered' | 'failed' | 'accepted';

export interface InvoiceItem {
  id: string;
  catalogItemId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  unitPriceHt?: number;
  vatRate: number; // e.g. 21, 12, 6, 0
  discountPercent?: number;
  totalHt: number;
  totalVat?: number;
  totalTtc: number;
}

export interface InvoiceTimelineEvent {
  id: string;
  status: string;
  label: string;
  description?: string;
  timestamp: string;
  actor?: string;
}

export type TimelineEvent = InvoiceTimelineEvent;

export interface Invoice {
  id: string;
  number: string;
  quoteId?: string;
  creditNoteId?: string;
  clientId: string;
  clientName: string;
  clientVat: string;
  clientEmail: string;
  clientAddress: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  amountPaid: number;
  balanceDue: number;
  structuredCommunication: string; // e.g. +++123/4567/89012+++
  currency: string;
  peppolStatus: PeppolStatus;
  peppolMessageId?: string;
  notes?: string;
  paymentTermsDays: number;
  timeline: InvoiceTimelineEvent[];
  remindersSent: number;
  createdAt: string;
}

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientVat: string;
  clientEmail: string;
  date: string;
  validUntil: string;
  status: QuoteStatus;
  items: InvoiceItem[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  notes?: string;
  convertedInvoiceId?: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  date: string;
  reason: string;
  items: InvoiceItem[];
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  status: CreditNoteStatus;
  createdAt: string;
}

export interface RecurringInvoice {
  id: string;
  title?: string;
  clientId: string;
  clientName: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRunDate?: string;
  nextIssueDate?: string;
  autoSend?: boolean;
  autoSendPeppol?: boolean;
  items: InvoiceItem[];
  totalHt?: number;
  totalVat?: number;
  totalTtc: number;
  status: 'active' | 'paused';
  lastGeneratedDate?: string;
}

export interface CustomerContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

export interface CustomerAddress {
  street: string;
  zip?: string;
  postalCode?: string;
  city: string;
  country: string;
}

export interface Customer {
  id: string;
  name: string;
  legalName?: string;
  vatNumber?: string;
  bceNumber: string;
  email: string;
  phone: string;
  iban?: string;
  address: CustomerAddress;
  contactPerson?: string;
  clientGroup?: string;
  paymentTerms: number;
  peppolEndpoint?: string;
  notes?: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  invoicesCount: number;
  averagePaymentDays?: number;
  createdAt: string;
  documentsCount?: number;
  contacts?: CustomerContact[];
}

export interface CatalogItem {
  id: string;
  type?: 'product' | 'service';
  name: string;
  description: string;
  reference?: string;
  sku?: string;
  unit: string;
  unitPrice: number;
  unitPriceHt?: number;
  vatRate: number; // 21, 12, 6, 0
  category: string;
  defaultDiscount?: number;
  accountingCategory?: string;
  active?: boolean;
  isActive?: boolean;
}

export interface CompanyProfile {
  name?: string;
  legalName: string;
  tradingName?: string;
  companyType?: string;
  bceNumber: string;
  vatNumber?: string;
  address: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone: string;
  email: string;
  website?: string;
  iban: string;
  bic: string;
  paymentTermsDays?: number;
  defaultCurrency?: string;
  vatSettings?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  latePaymentClause?: string;
  branding?: {
    logoUrl?: string;
    primaryColor: string;
    invoiceTemplate: 'classic' | 'modern' | 'minimal';
    footerText: string;
    signatureUrl?: string;
  };
}

export interface DocumentItem {
  id: string;
  name: string;
  folder?: string;
  category: 'client' | 'invoice' | 'company' | 'contract' | 'template' | 'proof_of_payment' | 'identity' | 'other';
  size: string;
  updatedAt?: string;
  createdAt?: string;
  attachedToId?: string;
  attachedToType?: string;
  fileType?: string;
  mimeType?: string;
}

export interface SubscriptionUsage {
  invoicesUsed: number;
  invoicesLimit: number;
  clientsUsed: number;
  clientsLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  teamMembersUsed: number;
  teamMembersLimit: number;
}

export interface SubscriptionPlan {
  id: 'free' | 'professional' | 'enterprise';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  features: string[];
}

export interface BillingHistoryItem {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface BillingSubscription {
  plan: 'free' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  price: number;
  status: 'active' | 'trialing' | 'past_due';
  currentPeriodEnd: string;
  usage: SubscriptionUsage;
  billingHistory: BillingHistoryItem[];
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'invoice' | 'client' | 'security' | 'system' | 'company';
  title: string;
  description: string;
  user: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  current?: boolean;
  isCurrent?: boolean;
  lastActive: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Administrator' | 'Accountant' | 'Employee' | 'Viewer' | 'admin' | 'accountant' | 'manager' | 'viewer';
  status: 'active' | 'invited';
  lastLogin?: string;
}

export interface SystemServiceStatus {
  service?: string;
  name?: string;
  status: 'operational' | 'degraded' | 'outage';
  latency: string;
  uptime: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read?: boolean;
  tone?: 'info' | 'success' | 'warn' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}

