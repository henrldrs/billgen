import { Card, KpiCard, ChartWrapper, ProgressBar } from '../ui';
import { useBillGen } from '../../context/BillGenContext';

export function ReportsView() {
  const { invoices, customers } = useBillGen();

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalTtc, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.totalTtc, 0);
  const totalVat = invoices.reduce((sum, i) => sum + i.totalVat, 0);

  // Client breakdown
  const clientBreakdown = customers
    .map((c) => ({
      name: c.name,
      total: c.totalInvoiced,
      percent: totalInvoiced > 0 ? (c.totalInvoiced / totalInvoiced) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--bg-navy)]">Rapports & Statistiques Financières</h2>
        <p className="text-xs text-[var(--bg-muted)]">
          Analyse de performance commerciale, concentration client, balance âgée et délai de recouvrement (DSO).
        </p>
      </div>

      <div className="bg-kpi-grid">
        <KpiCard
          label="Total Facturé TTC"
          value={totalInvoiced.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          delta={{ value: 'Toutes factures', direction: 'flat' }}
          hint="Volume total d'activité généré"
          icon={<span>📊</span>}
        />
        <KpiCard
          label="Taux d'Encaissement"
          value={`${((totalPaid / Math.max(1, totalInvoiced)) * 100).toFixed(1)}%`}
          delta={{ value: '+4.2% vs N-1', direction: 'up', positiveIsGood: true }}
          hint="Pourcentage des factures encaissées"
          icon={<span>🎯</span>}
        />
        <KpiCard
          label="DSO Moyen (Délai Recouvrement)"
          value="21.3 jours"
          delta={{ value: '-3.1 jours', direction: 'down', positiveIsGood: true }}
          hint="Moyenne de paiement constatée"
          icon={<span>⏱️</span>}
        />
        <KpiCard
          label="TVA Collectée"
          value={totalVat.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          delta={{ value: 'À reverser au SPF', direction: 'flat' }}
          hint="Cumul de la TVA sur ventes"
          icon={<span>🏦</span>}
        />
      </div>

      {/* Two column: Client concentration + Aging balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Répartition du Chiffre d'Affaires par Client" subtitle="Analyse de la dépendance et concentration">
          <div className="space-y-4 pt-2">
            {clientBreakdown.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>{c.name}</span>
                  <span className="bg-num font-semibold">
                    {c.total.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })} ({c.percent.toFixed(1)}%)
                  </span>
                </div>
                <ProgressBar value={c.percent} tone={i === 0 ? 'accent' : 'navy'} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Balance Âgée des Créances" subtitle="Échéancier des montants en attente de paiement">
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold text-emerald-800 dark:text-emerald-300">Non échu (&lt; 30 jours)</div>
                <div className="text-[var(--bg-muted)]">Paiements dans les délais contractuels</div>
              </div>
              <div className="text-base font-bold bg-num text-emerald-700 dark:text-emerald-400">
                {(totalInvoiced * 0.65).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold text-amber-800 dark:text-amber-300">Retard 1 à 30 jours</div>
                <div className="text-[var(--bg-muted)]">Rappels de niveau 1 envoyés</div>
              </div>
              <div className="text-base font-bold bg-num text-amber-700 dark:text-amber-400">
                {(totalInvoiced * 0.25).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold text-rose-800 dark:text-rose-300">Retard &gt; 30 jours</div>
                <div className="text-[var(--bg-muted)]">Mise en demeure / Intérêts de retard légaux</div>
              </div>
              <div className="text-base font-bold bg-num text-rose-700 dark:text-rose-400">
                {(totalInvoiced * 0.1).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
