import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  label: ReactNode;
  numeric?: boolean;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}

function SortCaret({ direction }: { direction?: SortDirection }) {
  return (
    <svg className="bg-table__caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M6 1.5 9 5H3z" fill="currentColor" opacity={direction === 'asc' ? 1 : 0.35} />
      <path d="M6 10.5 3 7h6z" fill="currentColor" opacity={direction === 'desc' ? 1 : 0.35} />
    </svg>
  );
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  empty,
  className,
}: TableProps<T>) {
  const classes = ['bg-table', className].filter(Boolean).join(' ');

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    const direction: SortDirection =
      sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, direction });
  };

  const cellValue = (row: T, column: TableColumn<T>): ReactNode => {
    if (column.render) return column.render(row);
    const value = (row as Record<string, unknown>)[column.key];
    return value == null ? '' : String(value);
  };

  return (
    <div className="bg-table-wrap">
      <table className={classes}>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key;
              const thClasses = [
                column.numeric ? 'bg-table__th--num' : '',
                sorted ? 'bg-table__th--sorted' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <th
                  key={column.key}
                  className={thClasses || undefined}
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    sorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="bg-table__sort"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      <SortCaret direction={sorted ? sort.direction : undefined} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty != null ? (
            <tr>
              <td className="bg-table__empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'bg-table__row--clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.numeric ? 'bg-num bg-table__cell--num' : undefined}
                  >
                    {cellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
