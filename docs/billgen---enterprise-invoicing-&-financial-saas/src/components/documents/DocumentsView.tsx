import { useState } from 'react';
import {
  Card,
  Table,
  TableColumn,
  Button,
  FileUpload,
  Modal,
  Field,
  TextInput,
  Select,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { DocumentItem } from '../../types';

export function DocumentsView() {
  const { documents, addDocument, deleteDocument, addToast } = useBillGen();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<'contract' | 'proof_of_payment' | 'identity' | 'other'>('contract');

  const handleFilesUpload = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    addDocument({
      name: docName || file.name,
      category,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      mimeType: file.type || 'application/pdf',
      createdAt: new Date().toISOString().split('T')[0],
    });
    setUploadModalOpen(false);
    setDocName('');
  };

  const columns: TableColumn<DocumentItem>[] = [
    {
      key: 'name',
      label: 'Nom du Document',
      render: (doc) => (
        <div className="flex items-center gap-2">
          <span className="text-base">📄</span>
          <div>
            <div className="font-semibold text-[var(--bg-navy)]">{doc.name}</div>
            <div className="text-xs text-[var(--bg-muted)]">{doc.mimeType}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (doc) => (
        <span className="capitalize text-xs font-medium bg-[var(--bg-app-shell)] px-2 py-0.5 rounded border border-[var(--bg-border)]">
          {doc.category === 'contract'
            ? 'Contrat'
            : doc.category === 'proof_of_payment'
            ? 'Preuve Paiement'
            : doc.category === 'identity'
            ? 'Identité / BCE'
            : 'Autre'}
        </span>
      ),
    },
    {
      key: 'size',
      label: 'Taille',
      render: (doc) => <span className="bg-num text-xs">{doc.size}</span>,
    },
    {
      key: 'createdAt',
      label: 'Date d’ajout',
      render: (doc) => <span className="bg-num text-xs">{doc.createdAt}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (doc) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addToast(`Téléchargement de "${doc.name}" démarré`, 'info')}
          >
            Télécharger
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteDocument(doc.id)}
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
          <h2 className="text-xl font-bold text-[var(--bg-navy)]">Coffre-fort & Documents Justificatifs</h2>
          <p className="text-xs text-[var(--bg-muted)]">
            Archivage à valeur probante des contrats, preuves d'encaissement et pièces comptables.
          </p>
        </div>
        <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
          + Déposer un Document
        </Button>
      </div>

      <Card padded={false}>
        <Table columns={columns} rows={documents} rowKey={(d) => d.id} empty="Aucun document archivé." />
      </Card>

      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Téléverser une pièce justificative"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Fermer
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="Titre du document (optionnel)">
            <TextInput
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Ex: Contrat de prestation signé 2026.pdf"
            />
          </Field>
          <Field label="Catégorie">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              options={[
                { value: 'contract', label: 'Contrat / Bon de commande' },
                { value: 'proof_of_payment', label: 'Extrait bancaire / Preuve de paiement' },
                { value: 'identity', label: 'Extrait BCE / Statuts' },
                { value: 'other', label: 'Autre pièce justificative' },
              ]}
            />
          </Field>
          <FileUpload
            onFiles={handleFilesUpload}
            accept=".pdf,.png,.jpg,.jpeg,.xml"
            hint="Formats supportés: PDF, PNG, JPG, XML (Max 25 MB)"
          />
        </div>
      </Modal>
    </div>
  );
}
