/** The one badge every invoice list and the record sheet agree on.
 *
 *  Overdue is the calendar's word, derived the way the server's reports
 *  derive it, and carries its age; it is the one state Badge has no colour
 *  for, so a warn tone rather than an invented modifier class. Everything
 *  else is the stored status, in the interface language (T-45, T-46, T-47). */

import { Badge } from "@henrioutai/ui";

import { daysOverdue } from "../lib/invoiceStatus";
import { statusLabel, t, tf, type Lang } from "../lib/translations";
import type { InvoiceResponse } from "../types";

export interface InvoiceStatusBadgeProps {
  invoice: Pick<InvoiceResponse, "status" | "due_date">;
  lang: Lang;
}

export function InvoiceStatusBadge({ invoice, lang }: InvoiceStatusBadgeProps) {
  const late = daysOverdue(invoice);
  if (late !== null) {
    return (
      <Badge tone="warn">
        {late === 1
          ? t(lang, "history.overdueDay")
          : tf(lang, "history.overdueDays", { days: late })}
      </Badge>
    );
  }
  if (invoice.status === "overdue") {
    // A row that says so without a date to count from — a restored backup
    // could — still reads as what it is rather than as nothing.
    return <Badge tone="warn">{t(lang, "history.overdue")}</Badge>;
  }
  return <Badge status={invoice.status as never}>{statusLabel(lang, invoice.status)}</Badge>;
}
