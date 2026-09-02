import { Modal, Button, Banner } from '../ui';
import { useBillGen } from '../../context/BillGenContext';

export interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const { company, setIsCreateInvoiceOpen, setActiveNav } = useBillGen();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Bienvenue sur BillGen — Plateforme de Facturation & Peppol"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            Explorer le tableau de bord
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              setIsCreateInvoiceOpen(true);
            }}
          >
            Créer ma première facture →
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <Banner tone="info" title="Prêt pour l'obligation Peppol B2B 2026">
          Votre compte est configuré avec l'identité légale belge de <strong>{company.name}</strong> ({company.bceNumber}). Toutes les factures générées respectent le standard européen UBL BIS 3.0.
        </Banner>

        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 p-3 bg-[var(--bg-app-shell)] rounded-lg border border-[var(--bg-border)]">
            <span className="text-lg">⚡</span>
            <div>
              <div className="font-bold text-[var(--bg-navy)]">1. Émission ultra-rapide</div>
              <div className="text-[var(--bg-muted)]">
                Calculez automatiquement les montants HT, TVA 6%/12%/21% et générez les communications structurées belges (+++090/xxxx/xxxxx+++).
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[var(--bg-app-shell)] rounded-lg border border-[var(--bg-border)]">
            <span className="text-lg">🌐</span>
            <div>
              <div className="font-bold text-[var(--bg-navy)]">2. Réseau Peppol e-Invoicing</div>
              <div className="text-[var(--bg-muted)]">
                Transmettez vos factures directement vers les ERP et logiciels comptables de vos clients professionnels en 1 clic.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[var(--bg-app-shell)] rounded-lg border border-[var(--bg-border)]">
            <span className="text-lg">📑</span>
            <div>
              <div className="font-bold text-[var(--bg-navy)]">3. Déclarations TVA & Grilles Intervat</div>
              <div className="text-[var(--bg-muted)]">
                Vos grilles [00], [03], [54] et [71] sont pré-calculées en temps réel pour votre fiduciaire comptable.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
