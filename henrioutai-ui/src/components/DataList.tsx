import type { ReactNode } from "react";

export interface DataListRow {
  key: string;
  label: ReactNode;
  /** Rendered as-is. Pass a Badge, a link, an amount in .bg-num — anything. */
  value: ReactNode;
  /** Identifiers (VAT, IBAN, references) in Geist Mono tabular figures. */
  mono?: boolean;
}

export interface DataListProps {
  rows: DataListRow[];
  /** "stacked" puts the label above the value — for narrow rails. */
  layout?: "inline" | "stacked";
  /** Shown in place of a null/undefined/empty value. */
  emptyValue?: ReactNode;
  className?: string;
}

function isEmpty(value: ReactNode): boolean {
  return value == null || value === "" || value === false;
}

/**
 * Label/value facts about one record — a real <dl>, not a two-column table.
 *
 * The identity half of every detail screen: VAT number, address, contact,
 * payment terms. Tables are for many records; this is for one, which is why
 * it carries no header row and no sorting.
 */
export function DataList({
  rows,
  layout = "stacked",
  emptyValue = "—",
  className,
}: DataListProps) {
  const classes = ["bg-datalist", `bg-datalist--${layout}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <dl className={classes}>
      {rows.map((row) => (
        <div key={row.key} className="bg-datalist__row">
          <dt className="bg-datalist__label">{row.label}</dt>
          <dd
            className={[
              "bg-datalist__value",
              row.mono ? "bg-num" : "",
              isEmpty(row.value) ? "bg-datalist__value--empty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isEmpty(row.value) ? emptyValue : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
