import { useState } from 'react';
import {
  Card,
  Table,
  TableColumn,
  Button,
  Badge,
  Modal,
  Field,
  TextInput,
  Select,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { RecurringInvoice } from '../../types';

export function RecurringView() {
  const { recurring, customers, addRecurring, toggleRecurringStatus } = useBillGen();
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('Abonnement maintenance & hébergement mensuel');
  const [amountHt, setAmountHt] = useState(350);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const handleCreate = () => {
    const cust = customers.find((c) => c.id === selectedClientId) || customers[0];
    const totalHt = Number(amountHt) || 0;
    const totalVat = totalHt * 0.21;
    const totalTtc = totalHt + totalVat;

    addRecurring({
      clientId: cust.id,
      clientName: cust.name,
      frequency,
      nextIssueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [
        {
          id: `ri-1`,
          description,
          quantity: 1,
          unitPriceHt: totalHt,
          vatRate: 21,
          totalHt,
          totalTtc,
        },
      ],
      totalHt,
      totalVat,
      totalTtc,
      status: 'active',
      autoSendPeppol: true,
    });

    setModalOpen(false);
  };

  const columns: TableColumn<RecurringInvoice>[] = [
    {
      key: 'clientName',
      label: 'Client / Contrat',
      render: (r) => <span className="font-semibold text-[var(--bg-navy)]">{r.clientName}</span>,
    },
    {
      key: 'frequency',
      label: 'Périodicité',
      render: (r) => (
        <span className="capitalize text-xs font-medium">
          {r.frequency === 'monthly' ? 'Mensuel' : r.frequency === 'quarterly' ? 'Trimestriel' : 'Annuel'}
        </span>
      ),
    },
    {
      key: 'nextIssueDate',
      label: 'Prochaine émission auto',
      render: (r) => <span className="bg-num text-xs">{r.nextIssueDate}</span>,
    },
    {
      key: 'autoSendPeppol',
      label: 'Envoi Peppol auto',
      render: (r) => (
        <span className="text-xs text-emerald-600 font-medium">
          {r.autoSendPeppol ? '✓ Activé' : 'Désactivé'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: 'totalTtc',
      label: 'Montant / Cycle',
      numeric: true,
      render: (r) => (
        <span className="bg-num font-semibold">
          {r.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={r.status === 'active' ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleRecurringStatus(r.id)}
          >
            {r.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Facturation Récurrente & Abonnements</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Automatisation des émissions périodiques avec génération et envoi automatique sur le réseau Peppol.
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Nouvel Abonnement
        </Button>
      </div>

      <Card padded={false}>
        <Table columns={columns} rows={recurring} rowKey={(r) => r.id} empty="Aucun abonnement récurrent configuré." />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un modèle de facturation récurrente"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Activer l'automatisation
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="Client bénéficiaire" required>
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              placeholder="Sélectionner un client..."
              options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` }))}
            />
          </Field>
          <Field label="Description de la prestation récurrente" required>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Montant HT par cycle (€)" required>
              <TextInput
                type="number"
                value={amountHt}
                onChange={(e) => setAmountHt(Number(e.target.value))}
              />
            </Field>
            <Field label="Fréquence" required>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                options={[
                  { value: 'monthly', label: 'Mensuelle (Tous les 1er du mois)' },
                  { value: 'quarterly', label: 'Trimestrielle' },
                  { value: 'yearly', label: 'Annuelle' },
                ]}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
