export interface BreadcrumbItem {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  /** Path from root to here — the last item is the current page. */
  items: BreadcrumbItem[];
  className?: string;
}

function Chevron() {
  return (
    <svg className="bg-breadcrumbs__sep" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M4.2 2 8.4 6l-4.2 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Path trail for nested screens. Ancestors are links/buttons, the last item
 * is the current page (aria-current, not clickable).
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const classes = ["bg-breadcrumbs", className].filter(Boolean).join(" ");
  return (
    <nav className={classes} aria-label="Breadcrumb">
      <ol className="bg-breadcrumbs__list">
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <li key={item.key} className="bg-breadcrumbs__item">
              {isCurrent ? (
                <span className="bg-breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <a className="bg-breadcrumbs__link" href={item.href} onClick={item.onClick}>
                      {item.label}
                    </a>
                  ) : (
                    <button type="button" className="bg-breadcrumbs__link" onClick={item.onClick}>
                      {item.label}
                    </button>
                  )}
                  <Chevron />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
