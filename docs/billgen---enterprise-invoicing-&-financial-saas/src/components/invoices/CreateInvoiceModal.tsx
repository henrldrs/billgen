import { useState } from 'react';
import {
  Modal,
  Button,
  Field,
  TextInput,
  Textarea,
  Select,
  Combobox,
  DatePicker,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { InvoiceItem } from '../../types';

export interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  const { customers, catalog, company, addInvoice, addToast } = useBillGen();

  // Client Selection or Input
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientVat, setClientVat] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Invoice Details
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string | null>(today);
  const [dueDate, setDueDate] = useState<string | null>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [notes, setNotes] = useState('');

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Prestation de conseil stratégique & accompagnement',
      quantity: 1,
      unitPriceHt: 1200,
      vatRate: 21,
      totalHt: 1200,
      totalTtc: 1452,
    },
  ]);

  // When client combobox changes
  const handleClientSelect = (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const found = customers.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.name);
      setClientEmail(found.email);
      setClientVat(found.bceNumber);
      setClientAddress(`${found.address.street}, ${found.address.postalCode} ${found.address.city}`);
      setPaymentTerms(found.paymentTerms);
      if (date) {
        const d = new Date(date);
        d.setDate(d.getDate() + found.paymentTerms);
        setDueDate(d.toISOString().split('T')[0]);
      }
    }
  };

  // Line Item modifications
  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPriceHt) || 0;
        const v = Number(updated.vatRate) || 0;
        const disc = Number(updated.discountPercent) || 0;

        const rawHt = q * p;
        const discountedHt = rawHt * (1 - disc / 100);
        const totalHt = discountedHt;
        const totalTtc = totalHt * (1 + v / 100);

        return {
          ...updated,
          totalHt,
          totalTtc,
        };
      })
    );
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPriceHt: 0,
      vatRate: 21,
      totalHt: 0,
      totalTtc: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const addFromCatalog = (catalogId: string) => {
    const cat = catalog.find((c) => c.id === catalogId);
    if (!cat) return;
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      catalogItemId: cat.id,
      description: cat.name + (cat.description ? ` - ${cat.description}` : ''),
      quantity: 1,
      unitPriceHt: cat.unitPriceHt,
      vatRate: cat.vatRate,
      totalHt: cat.unitPriceHt,
      totalTtc: cat.unitPriceHt * (1 + cat.vatRate / 100),
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Totals calculations
  const subtotalHt = items.reduce((sum, i) => sum + i.totalHt, 0);
  const totalVat = items.reduce((sum, i) => sum + (i.totalTtc - i.totalHt), 0);
  const totalTtc = subtotalHt + totalVat;

  const invoiceNumber = `${company.invoicePrefix}${String(company.nextInvoiceNumber).padStart(4, '0')}`;
  const randomSuffix = String(Math.floor(10000 + Math.random() * 89999));
  const structuredComm = `+++090/2026/${randomSuffix.slice(0, 5)}+++`;

  const handleSubmit = (actionStatus: 'draft' | 'issued' | 'peppol') => {
    if (!clientName.trim()) {
      addToast('Veuillez spécifier le nom du client', 'error');
      return;
    }
    if (items.length === 0 || subtotalHt <= 0) {
      addToast('Veuillez ajouter au moins une ligne de facturation valide', 'error');
      return;
    }

    const finalStatus = actionStatus === 'peppol' ? 'sent' : actionStatus;
    const finalPeppolStatus = actionStatus === 'peppol' ? 'delivered' : 'not_sent';

    addInvoice({
      number: invoiceNumber,
      clientId: selectedClientId || 'cust-adhoc',
      clientName,
      clientVat,
      clientEmail: clientEmail || 'client@facturation.be',
      clientAddress: clientAddress || 'Bruxelles, Belgique',
      date: date || today,
      dueDate: dueDate || today,
      paymentTermsDays: paymentTerms,
      status: finalStatus,
      peppolStatus: finalPeppolStatus,
      items,
      subtotalHt,
      totalVat,
      totalTtc,
      amountPaid: 0,
      balanceDue: totalTtc,
      structuredCommunication: structuredComm,
      currency: 'EUR',
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.bceNumber || c.email})`,
    hint: c.address.city,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <span>Nouvelle Facture</span>
            <span className="font-mono text-sm px-2 py-0.5 bg-[var(--bg-accent)] text-white rounded font-bold">
              {invoiceNumber}
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSubmit('draft')}>
              Enregistrer Brouillon
            </Button>
            <Button variant="secondary" onClick={() => handleSubmit('issued')}>
              Émettre la Facture
            </Button>
            <Button variant="primary" onClick={() => handleSubmit('peppol')}>
              🚀 Émettre & Transmettre Peppol
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Client Selection Card */}
        <div className="bg-[var(--bg-app-shell)] p-4 rounded-lg border border-[var(--bg-border)] space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--bg-navy)]">
            1. Informations Client / Débiteur
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Sélectionner un client existant">
              <Combobox
                options={customerOptions}
                value={selectedClientId}
                onChange={handleClientSelect}
                placeholder="Rechercher dans le répertoire client..."
              />
            </Field>
            <Field label="Nom de l'entreprise ou particulier" required>
              <TextInput
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: EuroConsulting SRL"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <Field label="N° Entreprise / TVA (BCE)">
              <TextInput
                value={clientVat}
                onChange={(e) => setClientVat(e.target.value)}
                placeholder="BE 0123.456.789"
              />
            </Field>
            <Field label="Email de facturation">
              <TextInput
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="compta@client.be"
              />
            </Field>
            <Field label="Adresse légale">
              <TextInput
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Rue de la Loi 16, 1000 Bruxelles"
              />
            </Field>
          </div>
        </div>

        {/* Invoice Meta details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Date d'émission" required>
            <DatePicker value={date} onChange={setDate} />
          </Field>
          <Field label="Délai de paiement (Jours)" required>
            <Select
              value={paymentTerms.toString()}
              onChange={(e) => {
                const days = Number(e.target.value);
                setPaymentTerms(days);
                if (date) {
                  const d = new Date(date);
                  d.setDate(d.getDate() + days);
                  setDueDate(d.toISOString().split('T')[0]);
                }
              }}
              options={[
                { value: '0', label: 'Comptant / Réception' },
                { value: '15', label: '15 jours net' },
                { value: '30', label: '30 jours fin de mois' },
                { value: '45', label: '45 jours net' },
                { value: '60', label: '60 jours' },
              ]}
            />
          </Field>
          <Field label="Date d'échéance">
            <DatePicker value={dueDate} onChange={setDueDate} />
          </Field>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--bg-navy)]">
              2. Lignes de Prestations & Articles
            </span>
            {catalog.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--bg-muted)]">Insérer depuis catalogue :</span>
                <select
                  className="bg-field__input text-xs py-1"
                  onChange={(e) => {
                    if (e.target.value) {
                      addFromCatalog(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choisir un article...
                  </option>
                  {catalog.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.unitPriceHt} € HT)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border border-[var(--bg-border)] rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--bg-app-shell)] border-b border-[var(--bg-border)]">
                <tr>
                  <th className="py-2 px-3 font-semibold">Description</th>
                  <th className="py-2 px-3 font-semibold w-20 text-right">Qté</th>
                  <th className="py-2 px-3 font-semibold w-28 text-right">Prix Unit. HT</th>
                  <th className="py-2 px-3 font-semibold w-24 text-right">Taux TVA</th>
                  <th className="py-2 px-3 font-semibold w-28 text-right">Total HT</th>
                  <th className="py-2 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-border)]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <TextInput
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Description du produit ou service..."
                      />
                    </td>
                    <td className="p-2">
                      <TextInput
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="text-right"
                      />
                    </td>
                    <td className="p-2">
                      <TextInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPriceHt}
                        onChange={(e) => updateItem(item.id, 'unitPriceHt', Number(e.target.value))}
                        className="text-right"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.vatRate}
                        onChange={(e) => updateItem(item.id, 'vatRate', Number(e.target.value))}
                        className="bg-field__input text-right text-xs"
                      >
                        <option value="21">21 % (Std)</option>
                        <option value="12">12 %</option>
                        <option value="6">6 %</option>
                        <option value="0">0 % (Exempté)</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-mono font-semibold">
                      {item.totalHt.toFixed(2)} €
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        className="text-rose-500 hover:text-rose-700 font-bold text-base"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="secondary" size="sm" onClick={addItem}>
            + Ajouter une ligne
          </Button>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-[var(--bg-border)]">
          <div className="w-full sm:max-w-md space-y-3">
            <Field label="Communication structurée (BCE / VCS)">
              <div className="font-mono text-sm font-bold bg-[var(--bg-app-shell)] px-3 py-2 rounded border border-[var(--bg-border)]">
                {structuredComm}
              </div>
            </Field>
            <Field label="Notes ou instructions particulières pour le client">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Merci pour votre confiance. Bon de commande PO-4592."
              />
            </Field>
          </div>

          <div className="w-full sm:max-w-xs bg-[var(--bg-app-shell)] p-4 rounded-lg border border-[var(--bg-border)] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--bg-muted)]">Sous-total HT :</span>
              <span className="font-mono font-semibold">{subtotalHt.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--bg-muted)]">Total TVA estimée :</span>
              <span className="font-mono font-semibold">{totalVat.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--bg-border)] text-sm font-bold text-[var(--bg-navy)]">
              <span>Montant Total TTC :</span>
              <span className="font-mono text-[var(--bg-accent)]">{totalTtc.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
