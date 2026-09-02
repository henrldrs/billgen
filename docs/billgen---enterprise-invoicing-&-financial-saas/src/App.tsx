import { useState, useEffect } from 'react';
import { BillGenProvider, useBillGen } from './context/BillGenContext';
import {
  TopNav,
  SidebarNav,
  SidebarNavItem,
  NotificationCenter,
  CommandPalette,
  ToastContainer,
  Button,
} from './components/ui';

// View modules
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoiceListView } from './components/invoices/InvoiceListView';
import { InvoiceDrawer } from './components/invoices/InvoiceDrawer';
import { CreateInvoiceModal } from './components/invoices/CreateInvoiceModal';
import { QuotesView } from './components/quotes/QuotesView';
import { CreditNotesView } from './components/credit-notes/CreditNotesView';
import { RecurringView } from './components/recurring/RecurringView';
import { CustomersView } from './components/customers/CustomersView';
import { CustomerDrawer } from './components/customers/CustomerDrawer';
import { CatalogView } from './components/catalog/CatalogView';
import { AccountingExportView } from './components/accounting/AccountingExportView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

function BillGenMainApp() {
  const {
    activeNav,
    setActiveNav,
    company,
    invoices,
    customers,
    quotes,
    creditNotes,
    recurring,
    notifications,
    isCreateInvoiceOpen,
    setIsCreateInvoiceOpen,
    selectedInvoiceForDrawer,
    setSelectedInvoiceForDrawer,
    selectedCustomerForDrawer,
    setSelectedCustomerForDrawer,
    toasts,
    removeToast,
  } = useBillGen();

  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Global keyboard shortcuts (Ctrl/Cmd + K for search, N for new invoice)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const mainNavItems: SidebarNavItem[] = [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: <span>🏠</span>,
    },
    {
      key: 'sales',
      label: 'Factures & Ventes',
      icon: <span>📄</span>,
      badge: invoices.filter((i) => i.status === 'overdue').length > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded-full">
          {invoices.filter((i) => i.status === 'overdue').length}
        </span>
      ) : undefined,
    },
    {
      key: 'quotes',
      label: 'Devis & Offres',
      icon: <span>📝</span>,
      badge: quotes.length > 0 ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
          {quotes.length}
        </span>
      ) : undefined,
    },
    {
      key: 'credit-notes',
      label: 'Notes de crédit',
      icon: <span>↩️</span>,
      badge: creditNotes.length > 0 ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
          {creditNotes.length}
        </span>
      ) : undefined,
    },
    {
      key: 'recurring',
      label: 'Abonnements récurrents',
      icon: <span>🔄</span>,
      badge: recurring.length > 0 ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
          {recurring.length}
        </span>
      ) : undefined,
    },
    {
      key: 'customers',
      label: 'Clients & Contacts',
      icon: <span>👥</span>,
      badge: customers.length > 0 ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
          {customers.length}
        </span>
      ) : undefined,
    },
    {
      key: 'catalog',
      label: 'Catalogue & Tarifs',
      icon: <span>🧰</span>,
    },
    {
      key: 'documents',
      label: 'Documents & Pièces',
      icon: <span>📁</span>,
    },
  ];

  const configNavItems: SidebarNavItem[] = [
    {
      key: 'accounting',
      label: 'Comptabilité & TVA 2026',
      icon: <span>🇧🇪</span>,
    },
    {
      key: 'reports',
      label: 'Rapports & Statistiques',
      icon: <span>📊</span>,
    },
    {
      key: 'settings',
      label: 'Paramètres & Peppol',
      icon: <span>⚙️</span>,
    },
  ];

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <TopNav
        brandName="BillGen"
        brandBadge="Peppol 2026 Ready"
        companyName={company.name}
        bceNumber={company.bceNumber}
        onSearchClick={() => setCommandPaletteOpen(true)}
        onCreateInvoiceClick={() => setIsCreateInvoiceOpen(true)}
        onNotificationsClick={() => setNotificationDrawerOpen(true)}
        unreadCount={unreadNotificationsCount}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onHelpClick={() => setOnboardingOpen(true)}
        onProfileClick={() => setActiveNav('settings')}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar - Geometric Balance Dark Slate */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } shrink-0 bg-[#111827] text-slate-300 transition-all duration-200 hidden md:flex flex-col justify-between select-none border-r border-slate-800`}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Sidebar Brand Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-sm">
                  B
                </div>
                {!sidebarCollapsed && (
                  <span className="text-white font-bold text-xl tracking-tight">BillGen</span>
                )}
              </div>
              <button
                type="button"
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Développer le menu' : 'Réduire le menu'}
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
            </div>

            {/* Menu Sections */}
            <div className="px-3 py-3 space-y-4">
              <div>
                {!sidebarCollapsed && (
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 py-2">
                    Menu Principal
                  </div>
                )}
                <SidebarNav
                  items={mainNavItems}
                  activeKey={activeNav}
                  onSelectKey={(key) => setActiveNav(key as any)}
                  collapsed={sidebarCollapsed}
                />
              </div>

              <div>
                {!sidebarCollapsed && (
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 py-2 border-t border-slate-800/60 pt-3">
                    Configuration & Fiscalité
                  </div>
                )}
                <SidebarNav
                  items={configNavItems}
                  activeKey={activeNav}
                  onSelectKey={(key) => setActiveNav(key as any)}
                  collapsed={sidebarCollapsed}
                />
              </div>
            </div>
          </div>

          {/* Storage Usage Widget */}
          {!sidebarCollapsed ? (
            <div className="p-4 bg-slate-900 border border-slate-800/90 m-3.5 rounded-xl shadow-xs">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                <span>Stockage Cloud</span>
                <span className="text-emerald-400 font-normal">Peppol OK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full mb-1.5 overflow-hidden">
                <div className="h-full bg-blue-500 w-4/5 rounded-full"></div>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                <span>1.4 / 5 GB</span>
                <span className="text-blue-400 font-semibold">82%</span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center border-t border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Peppol Connecté" />
            </div>
          )}
        </aside>

        {/* Mobile Navigation bar for small screens */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex justify-around items-center text-slate-400">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`p-2 rounded flex flex-col items-center text-[10px] ${
              activeNav === 'dashboard' ? 'text-blue-500 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="text-base">🏠</span>
            <span>Accueil</span>
          </button>
          <button
            onClick={() => setActiveNav('sales')}
            className={`p-2 rounded flex flex-col items-center text-[10px] ${
              activeNav === 'sales' ? 'text-blue-500 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="text-base">📄</span>
            <span>Factures</span>
          </button>
          <button
            onClick={() => setIsCreateInvoiceOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full -mt-4 shadow-lg flex items-center justify-center w-11 h-11"
          >
            <span className="text-xl leading-none font-bold">+</span>
          </button>
          <button
            onClick={() => setActiveNav('customers')}
            className={`p-2 rounded flex flex-col items-center text-[10px] ${
              activeNav === 'customers' ? 'text-blue-500 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="text-base">👥</span>
            <span>Clients</span>
          </button>
          <button
            onClick={() => setActiveNav('settings')}
            className={`p-2 rounded flex flex-col items-center text-[10px] ${
              activeNav === 'settings' ? 'text-blue-500 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>Réglages</span>
          </button>
        </div>

        {/* Primary Main View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeNav === 'dashboard' && <DashboardView />}
            {activeNav === 'sales' && <InvoiceListView />}
            {activeNav === 'quotes' && <QuotesView />}
            {activeNav === 'credit-notes' && <CreditNotesView />}
            {activeNav === 'recurring' && <RecurringView />}
            {activeNav === 'customers' && <CustomersView />}
            {activeNav === 'catalog' && <CatalogView />}
            {activeNav === 'accounting' && <AccountingExportView />}
            {activeNav === 'documents' && <DocumentsView />}
            {activeNav === 'reports' && <ReportsView />}
            {activeNav === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* 360° Invoice Inspector Drawer */}
      <InvoiceDrawer
        invoice={selectedInvoiceForDrawer}
        onClose={() => setSelectedInvoiceForDrawer(null)}
      />

      {/* 360° Customer Inspector Drawer */}
      <CustomerDrawer
        customer={selectedCustomerForDrawer}
        onClose={() => setSelectedCustomerForDrawer(null)}
      />

      {/* Invoice Creation Modal */}
      <CreateInvoiceModal
        open={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
      />

      {/* Notification Center Drawer */}
      <NotificationCenter
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />

      {/* Command Palette (Cmd + K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Onboarding Guide Modal */}
      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <BillGenProvider>
      <BillGenMainApp />
    </BillGenProvider>
  );
}
