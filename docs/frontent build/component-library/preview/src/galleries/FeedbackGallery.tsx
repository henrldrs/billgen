import { useRef, useState } from "react";
import { Modal } from "../../../components/Modal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Banner } from "../../../components/Banner";
import { Toast, ToastStack } from "../../../components/Toast";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ProgressBar } from "../../../components/ProgressBar";
import { Button } from "../../../components/Button";
import { Field } from "../../../components/Field";
import { TextInput } from "../../../components/TextInput";
import { IconChip, PolicyIcon } from "../../../components/icons";
import { Section, Row, type GalleryProps } from "../ui";

interface ToastItem {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

export function FeedbackGallery({ onAction }: GalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [progress, setProgress] = useState(35);
  const [banners, setBanners] = useState({ info: true, success: true, warn: true, danger: true });
  const nextToastId = useRef(1);

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, tone, message }]);
    onAction(`Toast pushed: ${message}`);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      <Section title="Modal — overlay glass (elevation 2), Esc / backdrop / × to close">
        <Row>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        </Row>
        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            onAction("Modal closed");
          }}
          title="Edit client"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  onAction("Modal: Save clicked");
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <Field label="Company name" htmlFor="m-name" required>
            <TextInput id="m-name" defaultValue="Acme Consulting BV" />
          </Field>
          <Field label="VAT number" htmlFor="m-vat" hint="Belgian format.">
            <TextInput id="m-vat" defaultValue="BE 0123.456.789" className="bg-num" />
          </Field>
        </Modal>
      </Section>

      <Section title="ConfirmDialog — destructive gate">
        <Row>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Void invoice…
          </Button>
        </Row>
        <ConfirmDialog
          open={confirmOpen}
          danger
          title="Void invoice 2026-0042?"
          confirmLabel="Void invoice"
          onConfirm={() => {
            setConfirmOpen(false);
            pushToast("success", "Invoice 2026-0042 voided.");
          }}
          onCancel={() => {
            setConfirmOpen(false);
            onAction("ConfirmDialog cancelled");
          }}
        >
          This can't be undone — the invoice keeps its number but becomes legally void.
        </ConfirmDialog>
      </Section>

      <Section title="Toast — transient, stacks bottom-right">
        <Row>
          <Button variant="secondary" onClick={() => pushToast("success", "Invoice sent via Peppol.")}>
            success toast
          </Button>
          <Button variant="secondary" onClick={() => pushToast("error", "Peppol delivery failed — retrying.")}>
            error toast
          </Button>
          <Button variant="secondary" onClick={() => pushToast("info", "Draft saved.")}>
            info toast
          </Button>
        </Row>
        <ToastStack>
          {toasts.map((t) => (
            <Toast key={t.id} tone={t.tone} message={t.message} onDismiss={() => dismissToast(t.id)} />
          ))}
        </ToastStack>
      </Section>

      <Section title="Banner — persistent page-level status (dismiss to remove)">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {banners.info && (
            <Banner tone="info" title="Heads up:" onDismiss={() => setBanners((b) => ({ ...b, info: false }))}>
              Peppol B2B e-invoicing becomes mandatory in 2026.
            </Banner>
          )}
          {banners.success && (
            <Banner tone="success" onDismiss={() => setBanners((b) => ({ ...b, success: false }))}>
              Your company profile is complete.
            </Banner>
          )}
          {banners.warn && (
            <Banner tone="warn" title="3 invoices overdue." onDismiss={() => setBanners((b) => ({ ...b, warn: false }))}>
              Payment reminders are paused.
            </Banner>
          )}
          {banners.danger && (
            <Banner tone="danger" title="Export blocked:" onDismiss={() => setBanners((b) => ({ ...b, danger: false }))}>
              VAT number missing on 2 clients.
            </Banner>
          )}
          {!banners.info && !banners.success && !banners.warn && !banners.danger && (
            <Button variant="link" onClick={() => setBanners({ info: true, success: true, warn: true, danger: true })}>
              bring the banners back
            </Button>
          )}
        </div>
      </Section>

      <Section title="EmptyState vs ErrorState">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)" }}>
            <EmptyState
              icon={
                <IconChip tone="neutral" size="lg">
                  <PolicyIcon />
                </IconChip>
              }
              title="No invoices yet"
              description="Create your first invoice and it will show up here."
              action={<Button onClick={() => onAction("EmptyState CTA clicked")}>New invoice</Button>}
            />
          </div>
          <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)" }}>
            <ErrorState
              description="The server didn't answer. Your data is safe — nothing was lost."
              onRetry={() => onAction("ErrorState retry clicked")}
            />
          </div>
        </div>
      </Section>

      <Section title="ProgressBar — determinate (buttons move it) + indeterminate">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 480 }}>
          <ProgressBar value={progress} label="Import progress" showValue />
          <Row>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setProgress((p) => Math.max(0, p - 15))}
            >
              −15
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setProgress((p) => Math.min(100, p + 15))}
            >
              +15
            </Button>
          </Row>
          <ProgressBar label="Waiting for Peppol network…" />
        </div>
      </Section>
    </>
  );
}
