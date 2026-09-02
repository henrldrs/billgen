import { useState } from 'react';
import {
  Drawer,
  Button,
  Badge,
  CopyButton,
  StatusTimeline,
  Divider,
  ConfirmDialog,
  TextInput,
  Field,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { Invoice } from '../../types';

export interface InvoiceDrawerProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoiceDrawer({ invoice, onClose }: InvoiceDrawerProps) {
  const {
    company,
    markInvoicePaid,
    sendInvoicePeppol,
    duplicateInvoice,
    sendInvoiceReminder,
    createCreditNoteFromInvoice,
    addToast,
  } = useBillGen();

  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [creditNoteReason, setCreditNoteReason] = useState('Annulation de commande ou correction tarifaire');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadUBL = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${invoice.number}</cbc:ID>
  <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${company.name}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${company.bceNumber}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${invoice.clientName}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.clientVat || 'N/A'}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>31</cbc:PaymentMeansCode>
    <cbc:PaymentID>${invoice.structuredCommunication}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${company.iban}</cbc:ID>
      <cac:FinancialInstitutionBranch><cbc:ID>${company.bic}</cbc:ID></cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${invoice.subtotalHt.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${invoice.subtotalHt.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${invoice.totalTtc.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${invoice.balanceDue.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peppol_UBL3_${invoice.number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Fichier UBL BIS 3.0 (${invoice.number}) téléchargé`, 'success');
  };

  return (
    <>
      <Drawer
        open={true}
        onClose={onClose}
        size="lg"
        title={
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg bg-num">{invoice.number}</span>
            <Badge status={invoice.status} />
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                🖨 Imprimer / PDF
              </Button>
              <Button variant="plain" size="sm" onClick={handleDownloadUBL}>
                📄 XML Peppol (UBL)
              </Button>
            </div>
            <div className="flex gap-2">
              {invoice.status !== 'paid' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    markInvoicePaid(invoice.id);
                  }}
                >
                  ✓ Marquer Payée
                </Button>
              )}
              {invoice.peppolStatus !== 'delivered' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    sendInvoicePeppol(invoice.id);
                  }}
                >
                  🚀 Envoyer Peppol
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Quick Action Toolbar */}
          <div className="bg-[var(--bg-card)] border border-[var(--bg-border)] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--bg-muted)]">Communication structurée :</span>
              <span className="font-mono font-bold text-[var(--bg-navy)] bg-[var(--bg-app-shell)] px-2 py-0.5 rounded border border-[var(--bg-border)]">
                {invoice.structuredCommunication}
              </span>
              <CopyButton textToCopy={invoice.structuredCommunication} size="sm" />
            </div>
            <div className="flex items-center gap-1.5">
              {invoice.status === 'overdue' && (
                <Button variant="outline" size="sm" onClick={() => sendInvoiceReminder(invoice.id)}>
                  🔔 Envoyer rappel
                </Button>
              )}
              <Button variant="plain" size="sm" onClick={() => duplicateInvoice(invoice.id)}>
                Dupliquer
              </Button>
              {invoice.status !== 'voided' && invoice.status !== 'cancelled' && (
                <Button variant="danger" size="sm" onClick={() => setCreditNoteModalOpen(true)}>
                  Créer un avoir (NC)
                </Button>
              )}
            </div>
          </div>

          {/* Realistic A4 Invoice Preview */}
          <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 md:p-8 rounded-lg border border-[var(--bg-border)] shadow-sm space-y-6 text-sm font-sans">
            {/* Header: Company & Invoice Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {company.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  <div>{company.address}</div>
                  <div>BCE / TVA : <span className="font-mono">{company.bceNumber}</span></div>
                  <div>IBAN : <span className="font-mono font-semibold">{company.iban}</span> (BIC: {company.bic})</div>
                  <div>Email : {company.email} · Tél : {company.phone}</div>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">FACTURE</div>
                <div className="text-2xl font-bold font-mono text-slate-800 dark:text-white mt-0.5">
                  {invoice.number}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                  <div>Date : <span className="font-mono font-medium">{invoice.date}</span></div>
                  <div>Échéance : <span className="font-mono font-medium">{invoice.dueDate}</span></div>
                  <div>Conditions : <span className="font-medium">{invoice.paymentTermsDays} jours</span></div>
                </div>
              </div>
            </div>

            {/* Bill To Customer Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 w-full sm:max-w-md">
                <div className="text-xs font-semibold uppercase text-slate-400">Facturé à :</div>
                <div className="font-bold text-base mt-1 text-slate-800 dark:text-slate-100">{invoice.clientName}</div>
                {invoice.clientVat && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                    N° BCE/TVA : {invoice.clientVat}
                  </div>
                )}
                {invoice.clientAddress && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {invoice.clientAddress}
                  </div>
                )}
                <div className="text-xs text-slate-500 dark:text-slate-400">{invoice.clientEmail}</div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded w-full sm:max-w-xs text-xs space-y-1">
                <div className="font-semibold text-emerald-800 dark:text-emerald-300">Modalités de paiement</div>
                <div className="text-slate-600 dark:text-slate-300">
                  À payer au compte <span className="font-mono font-medium">{company.iban}</span>
                </div>
                <div className="pt-1 font-semibold text-slate-800 dark:text-slate-200">
                  Communication obligatoire :
                </div>
                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800 text-center">
                  {invoice.structuredCommunication}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-700 text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Description</th>
                    <th className="py-2.5 px-2 text-right">Qté</th>
                    <th className="py-2.5 px-2 text-right">Prix Unit. HT</th>
                    <th className="py-2.5 px-2 text-right">TVA</th>
                    <th className="py-2.5 px-2 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-2 font-medium">{item.description}</td>
                      <td className="py-3 px-2 text-right font-mono">{item.quantity}</td>
                      <td className="py-3 px-2 text-right font-mono">
                        {item.unitPriceHt.toFixed(2)} €
                      </td>
                      <td className="py-3 px-2 text-right font-mono">{item.vatRate}%</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold">
                        {item.totalHt.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals and Tax Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="w-full sm:max-w-xs text-xs space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">Détail des bases TVA :</div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Taux 21% :</span>
                    <span className="font-mono font-medium">{invoice.totalVat.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taux 6% / 12% :</span>
                    <span className="font-mono">0.00 €</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:max-w-xs space-y-2 text-right text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Sous-total HT :</span>
                  <span className="font-mono font-semibold">{invoice.subtotalHt.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Total TVA :</span>
                  <span className="font-mono font-semibold">{invoice.totalVat.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white">
                  <span>Total TTC :</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {invoice.totalTtc.toFixed(2)} €
                  </span>
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Montant payé :</span>
                    <span className="font-mono">-{invoice.amountPaid.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-bold text-sm">
                  <span>Solde net à payer :</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    {invoice.balanceDue.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Mentions Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-normal space-y-1">
              <div>
                <strong>Conditions de vente :</strong> Les factures sont payables à l'échéance convenue. Tout retard de paiement entraîne de plein droit et sans mise en demeure un intérêt de retard conforme à la loi belge du 2 août 2002 ainsi qu'une indemnité forfaitaire de 10% (min. 40 €).
              </div>
              <div>
                <strong>Clause de réserve de propriété :</strong> Les marchandises ou prestations restent la propriété du vendeur jusqu'au paiement intégral du prix.
              </div>
            </div>
          </div>

          <Divider label="Audit log & Historique des événements" />

          {/* Timeline of events */}
          <StatusTimeline events={invoice.timeline} />
        </div>
      </Drawer>

      {/* Credit note confirmation dialog */}
      <ConfirmDialog
        open={creditNoteModalOpen}
        title={`Émettre une note de crédit pour la facture ${invoice.number}`}
        confirmLabel="Confirmer l'avoir"
        danger={true}
        onConfirm={() => {
          createCreditNoteFromInvoice(invoice.id, creditNoteReason);
          setCreditNoteModalOpen(false);
          onClose();
        }}
        onCancel={() => setCreditNoteModalOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--bg-muted)]">
            L'émission d'une note de crédit annulera le solde dû de cette facture et générera un document comptable officiel (NC).
          </p>
          <Field label="Motif légal de l'avoir" required>
            <TextInput
              value={creditNoteReason}
              onChange={(e) => setCreditNoteReason(e.target.value)}
              placeholder="Ex: Erreur de facturation, remise commerciale, annulation prestation"
            />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
