import React from 'react';
import {
  KpiCard,
  Card,
  Button,
  Badge,
  Table,
  TableColumn,
  ChartWrapper,
  ProgressBar,
  Banner,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { Invoice } from '../../types';

export function DashboardView() {
  const {
    invoices,
    customers,
    company,
    subscription,
    activityLogs,
    setActiveNav,
    setIsCreateInvoiceOpen,
    setSelectedInvoiceForDrawer,
    markInvoicePaid,
    sendInvoicePeppol,
  } = useBillGen();

  // Financial calculations
  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalTtc, 0);

  const outstandingTotal = invoices
    .filter((i) => ['issued', 'sent', 'delivered', 'viewed', 'partially_paid', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + i.balanceDue, 0);

  const overdueTotal = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + i.balanceDue, 0);

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const currentMonthRevenue = invoices
    .filter((i) => i.status === 'paid' && i.date.startsWith('2026-02'))
    .reduce((sum, i) => sum + i.totalTtc, 0);

  const pendingPeppolCount = invoices.filter((i) => i.peppolStatus === 'not_sent' && i.status !== 'draft').length;

  // Monthly revenue chart mock points (Jan - Dec 2026)
  const monthlyData = [
    { month: 'Sep', revenue: 14200, expenses: 4200 },
    { month: 'Oct', revenue: 19400, expenses: 5100 },
    { month: 'Nov', revenue: 23800, expenses: 6400 },
    { month: 'Dec', revenue: 31200, expenses: 8900 },
    { month: 'Jan', revenue: 26500, expenses: 7100 },
    { month: 'Fév', revenue: 34850, expenses: 9200 },
  ];

  const maxChartVal = Math.max(...monthlyData.map((d) => d.revenue)) * 1.15;

  const recentInvoices = invoices.slice(0, 5);

  const invoiceColumns: TableColumn<Invoice>[] = [
    {
      key: 'number',
      label: 'Numéro',
      render: (inv) => <span className="bg-num font-semibold text-[var(--bg-navy)]">{inv.number}</span>,
    },
    {
      key: 'clientName',
      label: 'Client',
      render: (inv) => (
        <div>
          <div className="font-medium">{inv.clientName}</div>
          <div className="text-xs text-[var(--bg-muted)] bg-num">{inv.clientVat || 'BCE non spécifié'}</div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date / Échéance',
      render: (inv) => (
        <div className="text-xs">
          <div className="bg-num">{inv.date}</div>
          <div className="text-[var(--bg-muted)] bg-num">Éch: {inv.dueDate}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (inv) => <Badge status={inv.status} />,
    },
    {
      key: 'peppolStatus',
      label: 'Peppol',
      render: (inv) => (
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            inv.peppolStatus === 'delivered'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : inv.peppolStatus === 'sending'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          {inv.peppolStatus === 'delivered' ? '✓ BIS 3.0' : inv.peppolStatus === 'sending' ? 'Envoi...' : 'Non transmis'}
        </span>
      ),
    },
    {
      key: 'totalTtc',
      label: 'Montant TTC',
      numeric: true,
      render: (inv) => (
        <span className="bg-num font-semibold">
          {inv.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          {inv.status !== 'paid' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markInvoicePaid(inv.id)}
              title="Encaisser"
            >
              Encaisser
            </Button>
          )}
          {inv.peppolStatus !== 'delivered' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoicePeppol(inv.id)}
              title="Envoyer sur le réseau Peppol"
            >
              Peppol
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert banner if invoices overdue or Peppol e-invoicing compliance */}
      {overdueCount > 0 && (
        <Banner
          tone="warn"
          title={`${overdueCount} facture(s) en retard de paiement`}
        >
          Montant total en souffrance :{' '}
          <strong className="bg-num">
            {overdueTotal.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          </strong>
          . Vous pouvez envoyer des rappels automatiques avec calcul des intérêts légaux.
        </Banner>
      )}

      {/* Primary KPI Grid */}
      <div className="bg-kpi-grid">
        <KpiCard
          label="Chiffre d'Affaires Encaissé"
          value={totalRevenue.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          delta={{ value: '+18.4% ce mois', direction: 'up', positiveIsGood: true }}
          hint="Total des factures payées sur l'exercice 2026"
          icon={<span className="text-xl">💰</span>}
        />
        <KpiCard
          label="En Cours & À Percevoir"
          value={outstandingTotal.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          delta={{ value: `${invoices.filter((i) => i.status !== 'paid').length} factures`, direction: 'flat' }}
          hint="Factures émises non encore échues"
          icon={<span className="text-xl">⏳</span>}
        />
        <KpiCard
          label="Montant en Retard"
          value={overdueTotal.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          delta={{
            value: `${overdueCount} client(s)`,
            direction: overdueCount > 0 ? 'up' : 'down',
            positiveIsGood: false,
          }}
          hint="Dépassement du délai de paiement convenu"
          icon={<span className="text-xl">⚠️</span>}
        />
        <KpiCard
          label="Conformité Peppol 2026"
          value={`${invoices.filter((i) => i.peppolStatus === 'delivered').length} / ${invoices.length}`}
          delta={{ value: 'Norme UBL BIS 3.0', direction: 'flat' }}
          hint={`Identifiant BCE: ${company.bceNumber}`}
          icon={<span className="text-xl">🇧🇪</span>}
        />
      </div>

      {/* Two Column Layout: Financial Chart + Quick Actions & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Évolution du Chiffre d'Affaires & Encaissements"
            subtitle="Vue consolidée des revenus mensuels HT / TTC et trésorerie"
            actions={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setActiveNav('reports')}>
                  Rapports détaillés →
                </Button>
              </div>
            }
          >
            <ChartWrapper height={240}>
              <div className="h-60 w-full flex flex-col justify-end pt-4">
                {/* SVG Bar / Area representation */}
                <div className="flex items-end justify-between h-44 gap-3 px-2">
                  {monthlyData.map((d, i) => {
                    const heightPercent = (d.revenue / maxChartVal) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="text-[11px] font-semibold text-[var(--bg-muted)] opacity-0 group-hover:opacity-100 transition-opacity bg-num">
                          {(d.revenue / 1000).toFixed(1)}k€
                        </div>
                        <div className="w-full max-w-[42px] bg-[var(--bg-border)] rounded-t-md h-full flex items-end overflow-hidden p-0.5">
                          <div
                            className="w-full bg-[var(--bg-accent)] rounded-t transition-all duration-500 group-hover:brightness-110 shadow-sm"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[var(--bg-text-secondary)]">{d.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ChartWrapper>

            {/* Quick breakdown metrics footer */}
            <div className="mt-4 pt-4 border-t border-[var(--bg-border)] grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-[var(--bg-muted)]">Panier moyen</div>
                <div className="text-base font-bold bg-num text-[var(--bg-navy)]">
                  {(totalRevenue / Math.max(1, invoices.filter((i) => i.status === 'paid').length)).toLocaleString('fr-BE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--bg-muted)]">Délai moyen paiement</div>
                <div className="text-base font-bold bg-num text-[var(--bg-navy)]">18.4 jours</div>
              </div>
              <div>
                <div className="text-xs text-[var(--bg-muted)]">Taux de recouvrement</div>
                <div className="text-base font-bold bg-num text-[var(--bg-accent)]">94.2%</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Side column: Quick Actions + Subscription Usage */}
        <div className="space-y-6">
          <Card title="Actions Rapides" subtitle="Gestion accélérée">
            <div className="space-y-2.5">
              <Button
                variant="primary"
                className="w-full justify-center text-sm py-2.5 shadow-sm"
                onClick={() => setIsCreateInvoiceOpen(true)}
              >
                + Émettre une Facture
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-center text-sm"
                onClick={() => setActiveNav('quotes')}
              >
                + Nouveau Devis / Offre
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center text-sm"
                onClick={() => setActiveNav('customers')}
              >
                + Ajouter un Client BCE
              </Button>
              <Button
                variant="plain"
                className="w-full justify-center text-xs text-[var(--bg-muted)]"
                onClick={() => setActiveNav('accounting')}
              >
                📥 Export Comptable (UBL / TVA)
              </Button>
            </div>
          </Card>

          <Card title="Utilisation du Plan" subtitle={`Plan ${subscription.plan.toUpperCase()}`}>
            <div className="space-y-3.5">
              <ProgressBar
                value={subscription.usage.invoicesUsed}
                max={subscription.usage.invoicesLimit}
                label="Factures ce mois"
                hint={`${subscription.usage.invoicesUsed} / ${subscription.usage.invoicesLimit}`}
              />
              <ProgressBar
                value={subscription.usage.clientsUsed}
                max={subscription.usage.clientsLimit}
                label="Clients enregistrés"
                hint={`${subscription.usage.clientsUsed} / ${subscription.usage.clientsLimit}`}
                tone="navy"
              />
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-[var(--bg-muted)]">Renouvellement le 01/03/2026</span>
                <Button variant="link" size="sm" onClick={() => setActiveNav('settings')}>
                  Gérer →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <Card
        title="Dernières Factures Émises"
        subtitle="Historique temps réel des factures récentes et statut Peppol"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setActiveNav('sales')}>
            Voir toutes les factures ({invoices.length}) →
          </Button>
        }
        padded={false}
      >
        <Table
          columns={invoiceColumns}
          rows={recentInvoices}
          rowKey={(inv) => inv.id}
          onRowClick={(inv) => setSelectedInvoiceForDrawer(inv)}
          empty="Aucune facture récente trouvée."
        />
      </Card>

      {/* Activity Stream + Legal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Journal d'Activité Récent" subtitle="Traçabilité et audit log conforme">
          <div className="space-y-3">
            {activityLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs pb-3 border-b border-[var(--bg-border)] last:border-0 last:pb-0">
                <span className="w-2 h-2 rounded-full bg-[var(--bg-accent)] mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-[var(--bg-navy)]">{log.title}</div>
                  <div className="text-[var(--bg-muted)]">{log.description}</div>
                </div>
                <div className="text-[var(--bg-muted)] bg-num whitespace-nowrap">{log.timestamp}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Entreprise & Conformité e-Invoicing" subtitle="Informations légales déclarées">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--bg-border)]">
              <span className="text-[var(--bg-muted)]">Raison sociale</span>
              <span className="font-medium text-[var(--bg-navy)]">{company.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--bg-border)]">
              <span className="text-[var(--bg-muted)]">Numéro d'entreprise / TVA</span>
              <span className="font-medium bg-num">{company.bceNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--bg-border)]">
              <span className="text-[var(--bg-muted)]">Compte IBAN (Paiement)</span>
              <span className="font-medium bg-num">{company.iban}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--bg-border)]">
              <span className="text-[var(--bg-muted)]">Point d'accès Peppol</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">● Opérationnel (SMP Actif)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--bg-muted)]">Prochain numéro chrono</span>
              <span className="font-medium bg-num">{`${company.invoicePrefix}${String(company.nextInvoiceNumber).padStart(4, '0')}`}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
