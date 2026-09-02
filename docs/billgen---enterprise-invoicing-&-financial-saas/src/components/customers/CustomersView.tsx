import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  TableColumn,
  Button,
  SearchBar,
  Modal,
  Field,
  TextInput,
  Textarea,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { Customer } from '../../types';

export function CustomersView() {
  const { customers, addCustomer, selectedCustomerForDrawer, setSelectedCustomerForDrawer } = useBillGen();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [bceNumber, setBceNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [notes, setNotes] = useState('');

  const handleCreateCustomer = () => {
    if (!name.trim()) return;
    addCustomer({
      name,
      bceNumber,
      email,
      phone,
      address: {
        street,
        postalCode,
        city,
        country: 'Belgique',
      },
      paymentTerms: Number(paymentTerms) || 30,
      notes,
    });
    setModalOpen(false);
    setName('');
    setBceNumber('');
    setEmail('');
    setPhone('');
    setStreet('');
    setPostalCode('');
    setCity('');
    setNotes('');
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.bceNumber && c.bceNumber.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q) ||
        c.address.city.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const columns: TableColumn<Customer>[] = [
    {
      key: 'name',
      label: 'Client / Entreprise',
      render: (c) => (
        <div>
          <div className="font-semibold text-[var(--bg-navy)]">{c.name}</div>
          <div className="text-xs text-[var(--bg-muted)]">{c.email}</div>
        </div>
      ),
    },
    {
      key: 'bceNumber',
      label: 'Numéro BCE / TVA',
      render: (c) => <span className="bg-num text-xs font-mono">{c.bceNumber || 'N/A'}</span>,
    },
    {
      key: 'city',
      label: 'Ville / Siège',
      render: (c) => <span className="text-xs">{c.address.city}, BE</span>,
    },
    {
      key: 'invoicesCount',
      label: 'Factures',
      numeric: true,
      render: (c) => <span className="bg-num font-semibold">{c.invoicesCount}</span>,
    },
    {
      key: 'totalInvoiced',
      label: 'Total Facturé TTC',
      numeric: true,
      render: (c) => (
        <span className="bg-num font-semibold">
          {c.totalInvoiced.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'outstanding',
      label: 'Solde en cours',
      numeric: true,
      render: (c) => (
        <span className={`bg-num font-semibold ${c.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {c.outstanding.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onClick={() => setSelectedCustomerForDrawer(c)}>
            Fiche 360° →
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Répertoire Clients & Débiteurs</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Vue 360° des clients, santé financière, suivi des encaissements et coordonnées BCE.
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Nouveau Client
        </Button>
      </div>

      <Card padded={false}>
        <div className="p-4 border-b border-[var(--bg-border)]">
          <div className="max-w-md">
            <SearchBar
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Rechercher par nom, BCE, email, ville..."
            />
          </div>
        </div>

        <Table
          columns={columns}
          rows={filteredCustomers}
          rowKey={(c) => c.id}
          onRowClick={(c) => setSelectedCustomerForDrawer(c)}
          empty="Aucun client trouvé."
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title="Ajouter un nouveau client au répertoire"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreateCustomer}>
              Enregistrer le Client
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Raison sociale ou Nom" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Acme Benelux BV" />
            </Field>
            <Field label="Numéro BCE / TVA (Belgique)">
              <TextInput
                value={bceNumber}
                onChange={(e) => setBceNumber(e.target.value)}
                placeholder="BE 0123.456.789"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email professionnel de facturation">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="facturation@acme.be"
              />
            </Field>
            <Field label="Numéro de téléphone">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 2 555 0199" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Rue et Numéro">
                <TextInput
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rue du Progrès 55"
                />
              </Field>
            </div>
            <div>
              <Field label="Code Postal">
                <TextInput
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1000"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville">
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bruxelles" />
            </Field>
            <Field label="Délai de paiement par défaut (Jours)">
              <TextInput
                type="number"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Notes internes et instructions comptables">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Facturation groupée en fin de mois requise."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
