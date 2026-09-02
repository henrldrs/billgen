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
import { Quote } from '../../types';

export function QuotesView() {
  const { quotes, customers, addQuote, convertQuoteToInvoice } = useBillGen();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New quote form
  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('Offre de services professionnels Q1 2026');
  const [amountHt, setAmountHt] = useState(2500);
  const [validityDays, setValidityDays] = useState(30);

  const handleCreateQuote = () => {
    const cust = customers.find((c) => c.id === selectedClientId) || customers[0];
    const totalHt = Number(amountHt) || 0;
    const totalVat = totalHt * 0.21;
    const totalTtc = totalHt + totalVat;
    const date = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];
    const qNum = `DEV-2026-${String(quotes.length + 1).padStart(3, '0')}`;

    addQuote({
      number: qNum,
      clientId: cust.id,
      clientName: cust.name,
      clientVat: cust.bceNumber,
      clientEmail: cust.email,
      date,
      validUntil,
      status: 'sent',
      items: [
        {
          id: `qi-1`,
          description,
          quantity: 1,
          unitPriceHt: totalHt,
          vatRate: 21,
          totalHt,
          totalTtc,
        },
      ],
      subtotalHt: totalHt,
      totalVat,
      totalTtc,
    });

    setCreateModalOpen(false);
  };

  const columns: TableColumn<Quote>[] = [
    {
      key: 'number',
      label: 'Numéro Devis',
      render: (q) => <span className="bg-num font-semibold text-[var(--bg-navy)]">{q.number}</span>,
    },
    {
      key: 'clientName',
      label: 'Client',
      render: (q) => (
        <div>
          <div className="font-medium">{q.clientName}</div>
          <div className="text-xs text-[var(--bg-muted)]">{q.clientEmail}</div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date émission',
      render: (q) => <span className="bg-num text-xs">{q.date}</span>,
    },
    {
      key: 'validUntil',
      label: 'Validité',
      render: (q) => <span className="bg-num text-xs">Jusqu'au {q.validUntil}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (q) => <Badge status={q.status} />,
    },
    {
      key: 'totalTtc',
      label: 'Montant TTC',
      numeric: true,
      render: (q) => (
        <span className="bg-num font-semibold">
          {q.totalTtc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (q) => (
        <div className="flex items-center justify-end gap-2">
          {q.status !== 'invoiced' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => convertQuoteToInvoice(q.id)}
            >
              Convertir en Facture →
            </Button>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">✓ Facturé</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Devis & Propositions</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Création de devis d'honoraires et transformation instantanée en factures certifiées.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          + Nouveau Devis
        </Button>
      </div>

      <Card padded={false}>
        <Table columns={columns} rows={quotes} rowKey={(q) => q.id} empty="Aucun devis enregistré." />
      </Card>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer un Devis Commercial"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreateQuote}>
              Générer le Devis
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
          <Field label="Description de la prestation" required>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Montant HT (€)" required>
              <TextInput
                type="number"
                value={amountHt}
                onChange={(e) => setAmountHt(Number(e.target.value))}
              />
            </Field>
            <Field label="Durée de validité (Jours)">
              <TextInput
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
