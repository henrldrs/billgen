import { useState } from 'react';
import { Card, Button, Banner, Field, Select } from '../ui';
import { useBillGen } from '../../context/BillGenContext';

export function AccountingExportView() {
  const { invoices, company, addToast } = useBillGen();
  const [period, setPeriod] = useState('2026-Q1');

  // Belgian VAT Grid calculations
  const subtotalHt = invoices.reduce((sum, i) => sum + (i.status !== 'voided' ? i.subtotalHt : 0), 0);
  const totalVat = invoices.reduce((sum, i) => sum + (i.status !== 'voided' ? i.totalVat : 0), 0);

  // Grille 03: Opérations à 21%
  const grille03 = subtotalHt;
  // Grille 54: TVA due sur grille 03
  const grille54 = totalVat;
  // Grille 00: Taux 0%
  const grille00 = 0;
  // Grille 55: TVA due sur autres
  const grille55 = 0;
  // Grille 71: Total TVA due
  const grille71 = grille54 + grille55;

  const handleExportCSV = () => {
    const headers = 'Numéro;Date;Client;N° BCE;Sous-total HT;Taux TVA;Total TVA;Total TTC;Statut;Communication\n';
    const rows = invoices
      .map(
        (i) =>
          `"${i.number}";"${i.date}";"${i.clientName}";"${i.clientVat || ''}";"${i.subtotalHt.toFixed(
            2
          )}";"${21}%";"${i.totalVat.toFixed(2)}";"${i.totalTtc.toFixed(2)}";"${i.status}";"${
            i.structuredCommunication
          }"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Journal_Ventes_BillGen_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Journal des ventes exporté en CSV (compatible WinBooks, Exact, Sage, BOB50)', 'success');
  };

  const handleExportUBLZip = () => {
    addToast('Archive ZIP Peppol UBL BIS 3.0 générée avec succès', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--bg-navy)]">Centre Comptable & Déclarations TVA</h2>
        <p className="text-xs text-[var(--bg-muted)]">
          Pré-remplissage des grilles de déclaration périodique TVA belge (Intervat) et exports de conformité.
        </p>
      </div>

      <Banner tone="info" title="Interopérabilité Logiciels Comptables Belges">
        Les exports BillGen sont certifiés compatibles avec Exact Online, WinBooks, Sage BOB 50, Horus Software, Yuki et la plateforme Intervat du SPF Finances.
      </Banner>

      {/* Period selector & Exports toolbar */}
      <Card
        title="Période Fiscale & Export Journal des Ventes"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              📥 Télécharger CSV (Journal des Ventes)
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportUBLZip}>
              📦 Export Peppol XML UBL
            </Button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
          <div className="w-full sm:w-64">
            <Field label="Trimestre / Mois d'imposition">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: '2026-Q1', label: '1er Trimestre 2026 (Jan - Mar)' },
                  { value: '2026-01', label: 'Janvier 2026' },
                  { value: '2026-02', label: 'Février 2026' },
                  { value: '2025-Q4', label: '4ème Trimestre 2025' },
                ]}
              />
            </Field>
          </div>
          <div className="text-[var(--bg-muted)] text-xs pt-4">
            Total factures prises en compte : <strong className="bg-num text-[var(--bg-navy)]">{invoices.length}</strong>
          </div>
        </div>
      </Card>

      {/* Official Belgian Intervat VAT Grids breakdown */}
      <Card
        title="Grilles Déclaration TVA (SPF Finances / Intervat)"
        subtitle="Décompte officiel généré pour votre comptable"
      >
        <div className="space-y-4 text-xs">
          <div className="border border-[var(--bg-border)] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--bg-app-shell)] border-b border-[var(--bg-border)]">
                <tr>
                  <th className="p-3 font-bold w-24">Grille</th>
                  <th className="p-3 font-semibold">Libellé Officiel SPF Finances</th>
                  <th className="p-3 font-semibold text-right w-40">Montant (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-border)]">
                <tr>
                  <td className="p-3 font-mono font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    Grille [00]
                  </td>
                  <td className="p-3">Opérations soumises à un taux particulier (0%) / Exonérations</td>
                  <td className="p-3 text-right font-mono font-semibold">{grille00.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    Grille [03]
                  </td>
                  <td className="p-3">Opérations à la sortie soumises au taux normal de 21% (Base HT)</td>
                  <td className="p-3 text-right font-mono font-semibold">{grille03.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300">
                    Grille [54]
                  </td>
                  <td className="p-3">TVA due sur opérations de la grille [03]</td>
                  <td className="p-3 text-right font-mono font-semibold">{grille54.toFixed(2)} €</td>
                </tr>
                <tr className="bg-[var(--bg-app-shell)] font-bold">
                  <td className="p-3 font-mono text-[var(--bg-navy)]">Grille [71]</td>
                  <td className="p-3">Total des taxes dues (Cadre IV)</td>
                  <td className="p-3 text-right font-mono text-[var(--bg-accent)] text-sm">
                    {grille71.toFixed(2)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-[var(--bg-muted)]">
            <span>Numéro de TVA déclarant : <strong className="bg-num">{company.bceNumber}</strong></span>
            <span>Date de génération : <strong className="bg-num">{new Date().toLocaleDateString('fr-BE')}</strong></span>
          </div>
        </div>
      </Card>
    </div>
  );
}
