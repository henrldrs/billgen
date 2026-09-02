import {
  Drawer,
  Button,
  Divider,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { Customer } from '../../types';

export interface CustomerDrawerProps {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDrawer({ customer, onClose }: CustomerDrawerProps) {
  const { invoices, setSelectedInvoiceForDrawer, setIsCreateInvoiceOpen } = useBillGen();

  if (!customer) return null;

  const clientInvoices = invoices.filter((i) => i.clientId === customer.id);

  return (
    <Drawer
      open={true}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{customer.name}</span>
          <span className="text-xs bg-[var(--bg-accent)] text-white px-2 py-0.5 rounded-full font-mono">
            {customer.bceNumber || 'BCE Particulier'}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              setIsCreateInvoiceOpen(true);
            }}
          >
            + Nouvelle Facture pour {customer.name}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* KPI Financial Overview for this client */}
        <div className="grid grid-cols-3 gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--bg-border)]">
          <div>
            <div className="text-[var(--bg-muted)]">Total Facturé</div>
            <div className="text-base font-bold bg-num text-[var(--bg-navy)] mt-0.5">
              {customer.totalInvoiced.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
          <div>
            <div className="text-[var(--bg-muted)]">Total Encaissé</div>
            <div className="text-base font-bold bg-num text-emerald-600 dark:text-emerald-400 mt-0.5">
              {customer.totalPaid.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
          <div>
            <div className="text-[var(--bg-muted)]">Solde Dû</div>
            <div className="text-base font-bold bg-num text-amber-600 dark:text-amber-400 mt-0.5">
              {customer.outstanding.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        {/* Client details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-app-shell)] p-3 rounded-lg border border-[var(--bg-border)] space-y-1.5">
            <div className="font-semibold text-[var(--bg-navy)]">Coordonnées Légales</div>
            <div><strong>N° Entreprise / TVA :</strong> <span className="bg-num">{customer.bceNumber}</span></div>
            <div><strong>Email de contact :</strong> {customer.email}</div>
            <div><strong>Téléphone :</strong> {customer.phone || 'Non renseigné'}</div>
            <div>
              <strong>Siège social :</strong> {customer.address.street}, {customer.address.postalCode}{' '}
              {customer.address.city}, {customer.address.country}
            </div>
          </div>

          <div className="bg-[var(--bg-app-shell)] p-3 rounded-lg border border-[var(--bg-border)] space-y-1.5">
            <div className="font-semibold text-[var(--bg-navy)]">Paramètres de Facturation</div>
            <div><strong>Délai de paiement standard :</strong> <span className="bg-num">{customer.paymentTerms} jours</span></div>
            <div><strong>IBAN client :</strong> <span className="bg-num">{customer.iban || 'Non renseigné'}</span></div>
            <div><strong>Point d'accès Peppol :</strong> <span className="text-emerald-600">Enregistré (BIS 3.0)</span></div>
            {customer.notes && <div><strong>Notes internes :</strong> {customer.notes}</div>}
          </div>
        </div>

        <Divider label={`Historique des factures (${clientInvoices.length})`} />

        {/* Client Invoices list */}
        <div className="border border-[var(--bg-border)] rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--bg-app-shell)] border-b border-[var(--bg-border)]">
              <tr>
                <th className="p-2.5 font-semibold">Numéro</th>
                <th className="p-2.5 font-semibold">Date</th>
                <th className="p-2.5 font-semibold">Statut</th>
                <th className="p-2.5 font-semibold text-right">Montant TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bg-border)]">
              {clientInvoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-[var(--bg-muted)]">
                    Aucune facture émise pour ce client.
                  </td>
                </tr>
              ) : (
                clientInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[var(--bg-app-shell)] cursor-pointer transition-colors"
                    onClick={() => {
                      onClose();
                      setSelectedInvoiceForDrawer(inv);
                    }}
                  >
                    <td className="p-2.5 font-semibold font-mono text-[var(--bg-navy)]">{inv.number}</td>
                    <td className="p-2.5 bg-num">{inv.date}</td>
                    <td className="p-2.5">
                      <span className="capitalize">{inv.status}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      {inv.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}
