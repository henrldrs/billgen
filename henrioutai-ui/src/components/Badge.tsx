import type { ReactNode } from "react";

/** Invoice lifecycle — matches the backend domain statuses 1:1. */
export type InvoiceStatus = "draft" | "issued" | "paid" | "partially_paid" | "voided";

export type BadgeTone = "neutral" | "info" | "success" | "warn" | "danger";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  partially_paid: "Partially paid",
  voided: "Voided",
};

export interface BadgeProps {
  /** Invoice status — sets color and, if no children, the label too. */
  status?: InvoiceStatus;
  /** Generic tone for non-invoice tags; ignored when status is set. */
  tone?: BadgeTone;
  children?: ReactNode;
  className?: string;
}

/**
 * Status badge / tag. `status` covers the invoice lifecycle with canonical
 * labels; `tone` covers everything else (feature tags, counts, filters).
 */
export function Badge({ status, tone = "neutral", children, className }: BadgeProps) {
  const toneClass = status ? `bg-badge--${status}` : `bg-badge--tone-${tone}`;
  const classes = ["bg-badge", toneClass, className].filter(Boolean).join(" ");
  return (
    <span className={classes}>
      <span className="bg-badge__dot" aria-hidden="true" />
      {children ?? (status ? STATUS_LABELS[status] : null)}
    </span>
  );
}
