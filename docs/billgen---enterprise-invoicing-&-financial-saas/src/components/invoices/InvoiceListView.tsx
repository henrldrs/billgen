import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  TableColumn,
  Tabs,
  Button,
  Badge,
  SearchBar,
  TableSort,
  Pagination,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { Invoice, InvoiceStatus } from '../../types';

export function InvoiceListView() {
  const {
    invoices,
    setIsCreateInvoiceOpen,
    setSelectedInvoiceForDrawer,
    markInvoicePaid,
    sendInvoicePeppol,
    duplicateInvoice,
    sendInvoiceReminder,
  } = useBillGen();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sort, setSort] = useState<TableSort>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: invoices.length,
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => ['issued', 'sent', 'delivered', 'viewed'].includes(i.status)).length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
      cancelled: invoices.filter((i) => ['cancelled', 'voided'].includes(i.status)).length,
    };
  }, [invoices]);

  const tabs = [
    { key: 'all', label: 'Toutes les factures', count: tabCounts.all },
    { key: 'draft', label: 'Brouillons', count: tabCounts.draft },
    { key: 'sent', label: 'En attente', count: tabCounts.sent },
    { key: 'paid', label: 'Payées', count: tabCounts.paid },
    { key: 'overdue', label: 'En retard', count: tabCounts.overdue },
    { key: 'cancelled', label: 'Annulées / Avoirs', count: tabCounts.cancelled },
  ];

  // Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Tab filter
      if (activeTab === 'draft' && inv.status !== 'draft') return false;
      if (activeTab === 'sent' && !['issued', 'sent', 'delivered', 'viewed'].includes(inv.status)) return false;
      if (activeTab === 'paid' && inv.status !== 'paid') return false;
      if (activeTab === 'overdue' && inv.status !== 'overdue') return false;
      if (activeTab === 'cancelled' && !['cancelled', 'voided'].includes(inv.status)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          inv.number.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          (inv.clientVat && inv.clientVat.toLowerCase().includes(q)) ||
          inv.structuredCommunication.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [invoices, activeTab, searchQuery]);

  // Sorting
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: any = a[sort.key as keyof Invoice];
      let valB: any = b[sort.key as keyof Invoice];
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (sort.direction === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [filteredInvoices, sort]);

  // Pagination
  const totalPages = Math.ceil(sortedInvoices.length / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, currentPage, pageSize]);

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'number',
      label: 'Numéro',
      sortable: true,
      render: (inv) => (
        <div>
          <span className="bg-num font-semibold text-[var(--bg-navy)]">{inv.number}</span>
          <div className="text-[11px] text-[var(--bg-muted)] bg-num">{inv.structuredCommunication}</div>
        </div>
      ),
    },
    {
      key: 'clientName',
      label: 'Client / Débiteur',
      sortable: true,
      render: (inv) => (
        <div>
          <div className="font-medium text-[var(--bg-text)]">{inv.clientName}</div>
          <div className="text-xs text-[var(--bg-muted)]">{inv.clientEmail}</div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date émission',
      sortable: true,
      render: (inv) => <span className="bg-num text-xs">{inv.date}</span>,
    },
    {
      key: 'dueDate',
      label: 'Échéance',
      sortable: true,
      render: (inv) => {
        const isOverdue = inv.status === 'overdue';
        return (
          <span className={`bg-num text-xs ${isOverdue ? 'text-rose-600 font-semibold dark:text-rose-400' : ''}`}>
            {inv.dueDate}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (inv) => <Badge status={inv.status} />,
    },
    {
      key: 'peppolStatus',
      label: 'Peppol BIS 3.0',
      render: (inv) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
            inv.peppolStatus === 'delivered'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : inv.peppolStatus === 'sending'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          {inv.peppolStatus === 'delivered' ? '✓ Délivrée' : inv.peppolStatus === 'sending' ? 'En cours...' : 'Non envoyé'}
        </span>
      ),
    },
    {
      key: 'totalTtc',
      label: 'Total TTC',
      numeric: true,
      sortable: true,
      render: (inv) => (
        <div className="text-right">
          <div className="bg-num font-bold text-[var(--bg-navy)]">
            {inv.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          </div>
          {inv.balanceDue > 0 && inv.status !== 'draft' && (
            <div className="text-[11px] text-amber-600 bg-num">
              Dû: {inv.balanceDue.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {inv.status !== 'paid' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markInvoicePaid(inv.id)}
              title="Marquer comme payée"
            >
              Encaisser
            </Button>
          )}
          {inv.status === 'overdue' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoiceReminder(inv.id)}
              title="Envoyer une relance par email"
            >
              Relancer
            </Button>
          )}
          {inv.peppolStatus !== 'delivered' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoicePeppol(inv.id)}
              title="Transmettre sur le réseau Peppol"
            >
              Peppol
            </Button>
          )}
          <Button
            variant="plain"
            size="sm"
            onClick={() => duplicateInvoice(inv.id)}
            title="Dupliquer la facture"
          >
            Dupliquer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Ventes & Factures</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Gestion du cycle de facturation, encaissements et transmission Peppol légale.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateInvoiceOpen(true)}>
          + Nouvelle Facture
        </Button>
      </div>

      {/* Tabs bar */}
      <Tabs items={tabs} activeKey={activeTab} onChange={(key) => { setActiveTab(key); setCurrentPage(1); }} />

      {/* Search and Filters Card */}
      <Card padded={false}>
        <div className="p-4 border-b border-[var(--bg-border)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="w-full sm:max-w-md">
            <SearchBar
              value={searchQuery}
              onValueChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
              placeholder="Rechercher par n° de facture, client, TVA ou communication..."
            />
          </div>
          <div className="text-xs text-[var(--bg-muted)] bg-num w-full sm:w-auto text-right">
            {filteredInvoices.length} facture(s) trouvée(s)
          </div>
        </div>

        <Table
          columns={columns}
          rows={paginatedInvoices}
          rowKey={(inv) => inv.id}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(inv) => setSelectedInvoiceForDrawer(inv)}
          empty="Aucune facture ne correspond à ces critères."
        />

        <div className="p-3 border-t border-[var(--bg-border)]">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={filteredInvoices.length}
          />
        </div>
      </Card>
    </div>
  );
}
