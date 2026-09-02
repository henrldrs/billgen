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
import { CatalogItem } from '../../types';

export function CatalogView() {
  const { catalog, addCatalogItem, updateCatalogItem, deleteCatalogItem } = useBillGen();
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPriceHt, setUnitPriceHt] = useState(150);
  const [vatRate, setVatRate] = useState(21);
  const [category, setCategory] = useState('Services');
  const [unit, setUnit] = useState('jour');

  const handleCreate = () => {
    if (!name.trim()) return;
    addCatalogItem({
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      description,
      unitPriceHt: Number(unitPriceHt) || 0,
      vatRate: Number(vatRate) || 21,
      unit,
      category,
      isActive: true,
    });
    setModalOpen(false);
    setName('');
    setSku('');
    setDescription('');
  };

  const columns: TableColumn<CatalogItem>[] = [
    {
      key: 'name',
      label: 'Article / Prestation',
      render: (item) => (
        <div>
          <div className="font-semibold text-[var(--bg-navy)]">{item.name}</div>
          <div className="text-xs text-[var(--bg-muted)]">{item.description}</div>
        </div>
      ),
    },
    {
      key: 'sku',
      label: 'Référence (SKU)',
      render: (item) => <span className="bg-num text-xs font-mono">{item.sku}</span>,
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (item) => <span className="text-xs">{item.category}</span>,
    },
    {
      key: 'unitPriceHt',
      label: 'Prix Unitaire HT',
      numeric: true,
      render: (item) => (
        <span className="bg-num font-semibold">
          {item.unitPriceHt.toFixed(2)} € / {item.unit}
        </span>
      ),
    },
    {
      key: 'vatRate',
      label: 'Taux TVA',
      numeric: true,
      render: (item) => <span className="bg-num font-semibold">{item.vatRate} %</span>,
    },
    {
      key: 'isActive',
      label: 'État',
      render: (item) => <Badge status={item.isActive ? 'active' : 'paused'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="plain"
            size="sm"
            onClick={() => updateCatalogItem(item.id, { isActive: !item.isActive })}
          >
            {item.isActive ? 'Désactiver' : 'Activer'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteCatalogItem(item.id)}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Catalogue Produits & Services</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Grille tarifaire standardisée, taux de TVA préconfigurés et insertion rapide dans les factures.
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Nouvel Article
        </Button>
      </div>

      <Card padded={false}>
        <Table columns={columns} rows={catalog} rowKey={(i) => i.id} empty="Aucun article dans le catalogue." />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un article au catalogue"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Ajouter au Catalogue
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom de l'article ou service" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Audit de conformité" />
            </Field>
            <Field label="Code SKU (optionnel)">
              <TextInput value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: SRV-AUD-01" />
            </Field>
          </div>

          <Field label="Description détaillée">
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Analyse approfondie des processus et remise du rapport certifié."
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Prix Unitaire HT (€)" required>
              <TextInput
                type="number"
                value={unitPriceHt}
                onChange={(e) => setUnitPriceHt(Number(e.target.value))}
              />
            </Field>
            <Field label="Taux TVA" required>
              <Select
                value={vatRate.toString()}
                onChange={(e) => setVatRate(Number(e.target.value))}
                options={[
                  { value: '21', label: '21% (Standard)' },
                  { value: '12', label: '12% (Intermédiaire)' },
                  { value: '6', label: '6% (Réduit)' },
                  { value: '0', label: '0% (Exonéré)' },
                ]}
              />
            </Field>
            <Field label="Unité">
              <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="jour, heure, forfait" />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
