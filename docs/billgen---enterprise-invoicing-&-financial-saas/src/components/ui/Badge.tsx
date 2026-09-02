import type { ReactNode } from 'react';
import { InvoiceStatus } from '../../types';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'accent';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  sent: 'Envoyée',
  delivered: 'Délivrée',
  viewed: 'Consultée',
  paid: 'Payée',
  partially_paid: 'Paiement partiel',
  overdue: 'En retard',
  cancelled: 'Annulée',
  voided: 'Avoir émis',
  active: 'Actif',
  paused: 'En pause',
  accepted: 'Accepté',
  rejected: 'Refusé',
  invoiced: 'Facturé',
};

export interface BadgeProps {
  status?: InvoiceStatus | string;
  tone?: BadgeTone;
  children?: ReactNode;
  className?: string;
}

export function Badge({ status, tone = 'neutral', children, className }: BadgeProps) {
  const toneClass = status ? `bg-badge--${status}` : `bg-badge--tone-${tone}`;
  const classes = ['bg-badge', toneClass, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <span className="bg-badge__dot" aria-hidden="true" />
      {children ?? (status ? STATUS_LABELS[status] || status : null)}
    </span>
  );
}
