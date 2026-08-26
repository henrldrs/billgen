import type { ReactNode } from "react";

export interface RecordLayoutProps {
  /** Identity rail — who or what this record is. Sticky on wide screens. */
  left: ReactNode;
  /** The record's substance: the tables and tabs people came here for. */
  children: ReactNode;
  /** Context rail — history, related records, documents. */
  right?: ReactNode;
  className?: string;
}

/**
 * Three-column record page: identity · substance · context.
 *
 * The shape a "360" screen wants — one record, its facts pinned on the left,
 * its history pinned on the right, and the work in the middle. Both rails are
 * fixed-width and sticky so the centre column can be as long as it needs to be
 * without the identity scrolling away from the invoice you are reading.
 *
 * Collapses to centre → left → right in one column below 1100px: on a narrow
 * screen the record's substance is what you came for, and the rails become
 * footnotes rather than a wall to scroll past.
 */
export function RecordLayout({ left, children, right, className }: RecordLayoutProps) {
  const classes = [
    "bg-record",
    right ? "bg-record--three" : "bg-record--two",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <aside className="bg-record__rail bg-record__rail--left">{left}</aside>
      <div className="bg-record__main">{children}</div>
      {right ? (
        <aside className="bg-record__rail bg-record__rail--right">{right}</aside>
      ) : null}
    </div>
  );
}
