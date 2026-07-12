import type { ReactNode } from "react";

export interface ListItemData {
  key: string | number;
  primary: ReactNode;
  secondary?: ReactNode;
  /** Leading visual — typically an IconChip. */
  leading?: ReactNode;
  /** Trailing slot — a Badge, an amount (wrap it in .bg-num), an action. */
  trailing?: ReactNode;
  /** Makes the row an interactive button. */
  onClick?: () => void;
}

export interface ListProps {
  items: ListItemData[];
  className?: string;
}

/**
 * Stacked list with hairline dividers: leading visual, primary/secondary
 * text, trailing slot. Rows with onClick render as real buttons.
 */
export function List({ items, className }: ListProps) {
  const classes = ["bg-list", className].filter(Boolean).join(" ");
  return (
    <ul className={classes}>
      {items.map((item) => {
        const content = (
          <>
            {item.leading ? <span className="bg-list__leading">{item.leading}</span> : null}
            <span className="bg-list__text">
              <span className="bg-list__primary">{item.primary}</span>
              {item.secondary ? (
                <span className="bg-list__secondary">{item.secondary}</span>
              ) : null}
            </span>
            {item.trailing ? <span className="bg-list__trailing">{item.trailing}</span> : null}
          </>
        );
        return (
          <li key={item.key} className="bg-list__item">
            {item.onClick ? (
              <button type="button" className="bg-list__row bg-list__row--clickable" onClick={item.onClick}>
                {content}
              </button>
            ) : (
              <div className="bg-list__row">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
