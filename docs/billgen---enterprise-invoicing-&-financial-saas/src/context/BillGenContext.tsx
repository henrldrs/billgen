import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Invoice,
  Customer,
  CatalogItem,
  CompanyProfile,
  Quote,
  CreditNote,
  RecurringInvoice,
  DocumentItem,
  BillingSubscription,
  ActivityLogItem,
  ActiveSession,
  TeamMember,
  SystemServiceStatus,
  InvoiceStatus,
  AppNotification,
} from '../types';
import {
  initialCompanyProfile,
  initialCustomers,
  initialCatalog,
  initialInvoices,
  initialQuotes,
  initialCreditNotes,
  initialRecurring,
  initialDocuments,
  initialSubscription,
  initialActivityLogs,
  initialSessions,
  initialTeamMembers,
  initialSystemStatus,
} from '../data/initialData';

export interface ToastNotification {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface BillGenContextType {
  // Data
  invoices: Invoice[];
  customers: Customer[];
  catalog: CatalogItem[];
  quotes: Quote[];
  creditNotes: CreditNote[];
  recurring: RecurringInvoice[];
  documents: DocumentItem[];
  company: CompanyProfile;
  subscription: BillingSubscription;
  activityLogs: ActivityLogItem[];
  sessions: ActiveSession[];
  teamMembers: TeamMember[];
  systemStatus: SystemServiceStatus[];
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // App UI State
  activeNav: string;
  setActiveNav: (nav: string) => void;
  activeOrgKey: string;
  setActiveOrgKey: (key: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  language: string;
  setLanguage: (lang: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isCreateInvoiceOpen: boolean;
  setIsCreateInvoiceOpen: (open: boolean) => void;
  selectedInvoiceForDrawer: Invoice | null;
  setSelectedInvoiceForDrawer: (inv: Invoice | null) => void;
  selectedCustomerForDrawer: Customer | null;
  setSelectedCustomerForDrawer: (cust: Customer | null) => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;

  // Actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'timeline' | 'remindersSent'>) => Invoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus, note?: string) => void;
  markInvoicePaid: (id: string) => void;
  sendInvoicePeppol: (id: string) => void;
  duplicateInvoice: (id: string) => Invoice;
  sendInvoiceReminder: (id: string) => void;
  createCreditNoteFromInvoice: (invoiceId: string, reason: string) => CreditNote;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalInvoiced' | 'totalPaid' | 'outstanding' | 'overdue' | 'invoicesCount' | 'averagePaymentDays' | 'documentsCount'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addCatalogItem: (item: Omit<CatalogItem, 'id'>) => CatalogItem;
  updateCatalogItem: (id: string, updates: Partial<CatalogItem>) => void;
  deleteCatalogItem: (id: string) => void;

  addQuote: (quote: Omit<Quote, 'id' | 'createdAt'>) => Quote;
  convertQuoteToInvoice: (quoteId: string) => Invoice;

  addRecurring: (rec: Omit<RecurringInvoice, 'id'>) => RecurringInvoice;
  toggleRecurringStatus: (id: string) => void;

  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  upgradeSubscription: (planId: 'free' | 'professional' | 'enterprise', cycle: 'monthly' | 'yearly') => void;

  addDocument: (doc: Omit<DocumentItem, 'id' | 'updatedAt'>) => void;
  deleteDocument: (id: string) => void;

  revokeSession: (id: string) => void;
  inviteTeamMember: (name: string, email: string, role: TeamMember['role']) => void;

  toasts: ToastNotification[];
  addToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  triggerConfetti: () => void;
}

const BillGenContext = createContext<BillGenContextType | undefined>(undefined);

export const BillGenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or use initial mock
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('bg_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('bg_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('bg_catalog');
    return saved ? JSON.parse(saved) : initialCatalog;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const saved = localStorage.getItem('bg_quotes');
    return saved ? JSON.parse(saved) : initialQuotes;
  });

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => {
    const saved = localStorage.getItem('bg_credit_notes');
    return saved ? JSON.parse(saved) : initialCreditNotes;
  });

  const [recurring, setRecurring] = useState<RecurringInvoice[]>(() => {
    const saved = localStorage.getItem('bg_recurring');
    return saved ? JSON.parse(saved) : initialRecurring;
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('bg_documents');
    return saved ? JSON.parse(saved) : initialDocuments;
  });

  const [company, setCompany] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem('bg_company');
    return saved ? JSON.parse(saved) : initialCompanyProfile;
  });

  const [subscription, setSubscription] = useState<BillingSubscription>(() => {
    const saved = localStorage.getItem('bg_subscription');
    return saved ? JSON.parse(saved) : initialSubscription;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(initialActivityLogs);
  const [sessions, setSessions] = useState<ActiveSession[]>(initialSessions);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [systemStatus] = useState<SystemServiceStatus[]>(initialSystemStatus);

  // App UI State
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [activeOrgKey, setActiveOrgKey] = useState<string>('org-1');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bg_theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [language, setLanguage] = useState<string>('fr');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoiceForDrawer, setSelectedInvoiceForDrawer] = useState<Invoice | null>(null);
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] = useState<Customer | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      title: 'Facture 2026-0041 payée',
      body: 'ABC SRL a réglé 7 502,00 € via virement bancaire SEPA.',
      time: 'Il y a 12 min',
      read: false,
      tone: 'success',
    },
    {
      id: 'notif-2',
      title: 'Délivrance Peppol confirmée',
      body: 'La facture 2026-0040 a été acceptée par le point d’accès Peppol de Brussels Tech Hub.',
      time: 'Il y a 2 heures',
      read: false,
      tone: 'info',
    },
    {
      id: 'notif-3',
      title: 'Échéance dépassée : Facture 2026-0038',
      body: 'Design Studio Flanders a 12 jours de retard (1 815,00 €). Relance automatique prête.',
      time: 'Hier',
      read: true,
      tone: 'warn',
    },
  ]);

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Apply theme to DOM
  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('bg_theme', newTheme);
    document.documentElement.setAttribute('data-bg-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-bg-theme', theme);
  }, [theme]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('bg_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('bg_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('bg_catalog', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('bg_company', JSON.stringify(company));
  }, [company]);

  // Toast Helpers
  const addToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399', '#059669', '#334155'],
      });
    } catch {
      // safe fallback
    }
  };

  const logActivity = (type: ActivityLogItem['type'], title: string, description: string) => {
    const newLog: ActivityLogItem = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
      type,
      title,
      description,
      user: 'Henri Dr Silva',
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Actions
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'timeline' | 'remindersSent'>) => {
    const id = `inv-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      createdAt,
      remindersSent: 0,
      timeline: [
        {
          id: `t-${Date.now()}-1`,
          status: 'draft',
          label: 'Facture créée',
          description: `Créée par Henri Dr Silva pour ${invoiceData.clientName}`,
          timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
        },
        ...(invoiceData.status !== 'draft'
          ? [
              {
                id: `t-${Date.now()}-2`,
                status: invoiceData.status,
                label: `Statut passé à : ${invoiceData.status}`,
                timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
              },
            ]
          : []),
      ],
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    // increment company counter
    setCompany((prev) => ({
      ...prev,
      nextInvoiceNumber: prev.nextInvoiceNumber + 1,
    }));
    // update subscription usage
    setSubscription((prev) => ({
      ...prev,
      usage: { ...prev.usage, invoicesUsed: prev.usage.invoicesUsed + 1 },
    }));
    // update customer metrics
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === invoiceData.clientId) {
          const outstanding = invoiceData.status === 'paid' ? c.outstanding : c.outstanding + invoiceData.balanceDue;
          const totalInvoiced = c.totalInvoiced + invoiceData.totalTtc;
          const totalPaid = invoiceData.status === 'paid' ? c.totalPaid + invoiceData.totalTtc : c.totalPaid;
          return {
            ...c,
            totalInvoiced,
            totalPaid,
            outstanding,
            invoicesCount: c.invoicesCount + 1,
          };
        }
        return c;
      })
    );

    logActivity('invoice', `Facture #${newInvoice.number} créée`, `Montant: ${newInvoice.totalTtc.toFixed(2)} € pour ${newInvoice.clientName}`);
    addToast(`Facture #${newInvoice.number} enregistrée avec succès`, 'success');
    triggerConfetti();
    return newInvoice;
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus, note?: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const timeline = [
            ...inv.timeline,
            {
              id: `t-${Date.now()}`,
              status,
              label: `Statut : ${status}`,
              description: note || `Mis à jour manuellement`,
              timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
          return { ...inv, status, timeline };
        }
        return inv;
      })
    );
    addToast(`Statut de la facture mis à jour : ${status}`, 'info');
  };

  const markInvoicePaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const amountPaid = inv.totalTtc;
          const balanceDue = 0;
          const timeline = [
            ...inv.timeline,
            {
              id: `t-${Date.now()}`,
              status: 'paid',
              label: 'Facture encaissée intégralement',
              description: `Virement reçu (communication: ${inv.structuredCommunication})`,
              timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
          return {
            ...inv,
            status: 'paid',
            amountPaid,
            balanceDue,
            timeline,
          };
        }
        return inv;
      })
    );
    triggerConfetti();
    addToast('Facture marquée comme payée', 'success');
    logActivity('invoice', `Paiement reçu`, `Facture marquée payée`);
  };

  const sendInvoicePeppol = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const timeline = [
            ...inv.timeline,
            {
              id: `t-${Date.now()}`,
              status: 'sent',
              label: 'Transmission Peppol e-Delivery réussie',
              description: `Accusé de réception réseau UBL BIS 3.0 délivré`,
              timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
          return {
            ...inv,
            status: inv.status === 'draft' ? 'sent' : inv.status,
            peppolStatus: 'delivered',
            peppolMessageId: `urn:peppol:be:bce:${company.bceNumber.replace(/\D/g, '')}:${inv.number}`,
            timeline,
          };
        }
        return inv;
      })
    );
    addToast('Facture transmise avec succès sur le réseau Peppol', 'success');
    logActivity('invoice', 'Transmission Peppol e-Invoicing', `Facture envoyée`);
  };

  const duplicateInvoice = (id: string) => {
    const source = invoices.find((i) => i.id === id);
    if (!source) throw new Error('Invoice not found');
    const nextNum = `${company.invoicePrefix}${String(company.nextInvoiceNumber).padStart(4, '0')}`;
    return addInvoice({
      ...source,
      number: nextNum,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + source.paymentTermsDays * 86400000).toISOString().split('T')[0],
      status: 'draft',
      peppolStatus: 'not_sent',
      amountPaid: 0,
      balanceDue: source.totalTtc,
      structuredCommunication: `+++${Math.floor(100 + Math.random() * 899)}/${new Date().getFullYear()}/${String(company.nextInvoiceNumber).padStart(5, '0')}+++`,
    });
  };

  const sendInvoiceReminder = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const count = (inv.remindersSent || 0) + 1;
          const timeline = [
            ...inv.timeline,
            {
              id: `t-${Date.now()}`,
              status: 'overdue',
              label: `Rappel de paiement #${count} envoyé`,
              description: `Notification email avec décompte des intérêts de retard envoyée à ${inv.clientEmail}`,
              timestamp: 'Aujourd’hui · ' + new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
          return {
            ...inv,
            remindersSent: count,
            timeline,
          };
        }
        return inv;
      })
    );
    addToast('Rappel de paiement envoyé au client avec succès', 'info');
  };

  const createCreditNoteFromInvoice = (invoiceId: string, reason: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');
    const ncNumber = `NC-2026-${String(creditNotes.length + 5).padStart(3, '0')}`;
    const newCreditNote: CreditNote = {
      id: `cn-${Date.now()}`,
      number: ncNumber,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      clientId: inv.clientId,
      clientName: inv.clientName,
      date: new Date().toISOString().split('T')[0],
      reason,
      items: inv.items.map((item) => ({
        ...item,
        id: `cni-${Date.now()}-${item.id}`,
      })),
      totalHt: inv.subtotalHt,
      totalVat: inv.totalVat,
      totalTtc: inv.totalTtc,
      status: 'validated',
      createdAt: new Date().toISOString(),
    };

    setCreditNotes((prev) => [newCreditNote, ...prev]);
    // update invoice status to voided or partially adjusted
    updateInvoiceStatus(inv.id, 'voided', `Avoir ${ncNumber} émis`);
    addToast(`Note de crédit ${ncNumber} créée`, 'success');
    return newCreditNote;
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'totalInvoiced' | 'totalPaid' | 'outstanding' | 'overdue' | 'invoicesCount' | 'averagePaymentDays' | 'documentsCount'>) => {
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      overdue: 0,
      invoicesCount: 0,
      averagePaymentDays: customerData.paymentTerms || 30,
      documentsCount: 0,
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSubscription((prev) => ({
      ...prev,
      usage: { ...prev.usage, clientsUsed: prev.usage.clientsUsed + 1 },
    }));
    logActivity('client', `Client "${newCust.name}" ajouté`, `BCE: ${newCust.bceNumber}`);
    addToast(`Client "${newCust.name}" ajouté au répertoire`, 'success');
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    addToast('Fiche client mise à jour', 'info');
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    addToast('Client supprimé', 'info');
  };

  const addCatalogItem = (itemData: Omit<CatalogItem, 'id'>) => {
    const newItem: CatalogItem = {
      ...itemData,
      id: `cat-${Date.now()}`,
    };
    setCatalog((prev) => [newItem, ...prev]);
    addToast(`"${newItem.name}" ajouté au catalogue`, 'success');
    return newItem;
  };

  const updateCatalogItem = (id: string, updates: Partial<CatalogItem>) => {
    setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    addToast('Article catalogue mis à jour', 'info');
  };

  const deleteCatalogItem = (id: string) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id));
    addToast('Article supprimé du catalogue', 'info');
  };

  const addQuote = (quoteData: Omit<Quote, 'id' | 'createdAt'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setQuotes((prev) => [newQuote, ...prev]);
    addToast(`Devis #${newQuote.number} créé`, 'success');
    return newQuote;
  };

  const convertQuoteToInvoice = (quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error('Quote not found');
    const nextNum = `${company.invoicePrefix}${String(company.nextInvoiceNumber).padStart(4, '0')}`;
    const newInv = addInvoice({
      number: nextNum,
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientVat: quote.clientVat,
      clientEmail: quote.clientEmail,
      clientAddress: 'Bruxelles, Belgique',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      items: quote.items,
      subtotalHt: quote.subtotalHt,
      totalVat: quote.totalVat,
      totalTtc: quote.totalTtc,
      amountPaid: 0,
      balanceDue: quote.totalTtc,
      structuredCommunication: `+++${Math.floor(100 + Math.random() * 899)}/${new Date().getFullYear()}/${String(company.nextInvoiceNumber).padStart(5, '0')}+++`,
      currency: 'EUR',
      peppolStatus: 'not_sent',
      paymentTermsDays: 30,
      notes: `Établi sur base du devis accepté #${quote.number}`,
    });

    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: 'invoiced', convertedInvoiceId: newInv.id } : q))
    );
    addToast(`Devis transformé en facture #${newInv.number}`, 'success');
    return newInv;
  };

  const addRecurring = (recData: Omit<RecurringInvoice, 'id'>) => {
    const newRec: RecurringInvoice = {
      ...recData,
      id: `rec-${Date.now()}`,
    };
    setRecurring((prev) => [newRec, ...prev]);
    addToast('Abonnement de facturation récurrente programmé', 'success');
    return newRec;
  };

  const toggleRecurringStatus = (id: string) => {
    setRecurring((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r))
    );
  };

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setCompany((prev) => ({ ...prev, ...profile }));
    addToast('Données et identité de l’entreprise sauvegardées', 'success');
    logActivity('company', 'Profil d’entreprise mis à jour', 'Informations légales et bancaires');
  };

  const upgradeSubscription = (planId: 'free' | 'professional' | 'enterprise', cycle: 'monthly' | 'yearly') => {
    const prices: Record<string, number> = {
      free: 0,
      professional: cycle === 'monthly' ? 19 : 190,
      enterprise: cycle === 'monthly' ? 49 : 490,
    };
    setSubscription((prev) => ({
      ...prev,
      plan: planId,
      billingCycle: cycle,
      price: prices[planId],
      usage: {
        ...prev.usage,
        invoicesLimit: planId === 'free' ? 20 : planId === 'professional' ? 100 : 5000,
        clientsLimit: planId === 'free' ? 10 : planId === 'professional' ? 100 : 5000,
        storageLimitGb: planId === 'free' ? 1 : planId === 'professional' ? 5 : 50,
      },
    }));
    triggerConfetti();
    addToast(`Abonnement mis à niveau vers le plan ${planId.toUpperCase()} !`, 'success');
  };

  const addDocument = (doc: Omit<DocumentItem, 'id' | 'updatedAt'>) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setDocuments((prev) => [newDoc, ...prev]);
    addToast(`Document "${newDoc.name}" archivé`, 'success');
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    addToast('Document supprimé', 'info');
  };

  const revokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    addToast('Session révoquée avec succès', 'info');
    logActivity('security', 'Session révoquée', `Appareil déconnecté`);
  };

  const inviteTeamMember = (name: string, email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name,
      email,
      role,
      status: 'invited',
    };
    setTeamMembers((prev) => [...prev, newMember]);
    addToast(`Invitation envoyée à ${email}`, 'success');
  };

  return (
    <BillGenContext.Provider
      value={{
        invoices,
        customers,
        catalog,
        quotes,
        creditNotes,
        recurring,
        documents,
        company,
        subscription,
        activityLogs,
        sessions,
        teamMembers,
        systemStatus,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        activeNav,
        setActiveNav,
        activeOrgKey,
        setActiveOrgKey,
        theme,
        setTheme,
        language,
        setLanguage,
        commandPaletteOpen,
        setCommandPaletteOpen,
        isCreateInvoiceOpen,
        setIsCreateInvoiceOpen,
        selectedInvoiceForDrawer,
        setSelectedInvoiceForDrawer,
        selectedCustomerForDrawer,
        setSelectedCustomerForDrawer,
        onboardingOpen,
        setOnboardingOpen,
        addInvoice,
        updateInvoiceStatus,
        markInvoicePaid,
        sendInvoicePeppol,
        duplicateInvoice,
        sendInvoiceReminder,
        createCreditNoteFromInvoice,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        addQuote,
        convertQuoteToInvoice,
        addRecurring,
        toggleRecurringStatus,
        updateCompanyProfile,
        upgradeSubscription,
        addDocument,
        deleteDocument,
        revokeSession,
        inviteTeamMember,
        toasts,
        addToast,
        removeToast,
        triggerConfetti,
      }}
    >
      {children}
    </BillGenContext.Provider>
  );
};

export const useBillGen = () => {
  const context = useContext(BillGenContext);
  if (!context) {
    throw new Error('useBillGen must be used within a BillGenProvider');
  }
  return context;
};
