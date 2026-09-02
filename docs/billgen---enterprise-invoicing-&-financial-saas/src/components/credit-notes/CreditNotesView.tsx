import { Card, Table, TableColumn, Badge } from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { CreditNote } from '../../types';

export function CreditNotesView() {
  const { creditNotes } = useBillGen();

  const columns: TableColumn<CreditNote>[] = [
    {
      key: 'number',
      label: 'Numéro Note de Crédit',
      render: (cn) => <span className="bg-num font-semibold text-[var(--bg-navy)]">{cn.number}</span>,
    },
    {
      key: 'invoiceNumber',
      label: 'Facture d’origine',
      render: (cn) => <span className="bg-num text-xs font-mono">{cn.invoiceNumber}</span>,
    },
    {
      key: 'clientName',
      label: 'Client',
      render: (cn) => <span className="font-medium">{cn.clientName}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (cn) => <span className="bg-num text-xs">{cn.date}</span>,
    },
    {
      key: 'reason',
      label: 'Motif de l’avoir',
      render: (cn) => <span className="text-xs text-[var(--bg-muted)]">{cn.reason}</span>,
    },
    {
      key: 'status',
      label: 'Statut comptable',
      render: (cn) => <Badge status={cn.status} />,
    },
    {
      key: 'totalTtc',
      label: 'Montant Avoir TTC',
      numeric: true,
      render: (cn) => (
        <span className="bg-num font-bold text-rose-600 dark:text-rose-400">
          -{cn.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--bg-navy)]">Notes de Crédit & Avoirs</h2>
        <p className="text-xs text-[var(--bg-muted)]">
          Registre officiel des rectifications et avoirs transmis à l'administration fiscale et aux clients.
        </p>
      </div>

      <Card padded={false}>
        <Table columns={columns} rows={creditNotes} rowKey={(cn) => cn.id} empty="Aucune note de crédit émise." />
      </Card>
    </div>
  );
}
