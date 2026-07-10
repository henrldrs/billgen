export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown on each side of the current page (default 1). */
  siblingCount?: number;
  className?: string;
}

type PageEntry = number | "gap-left" | "gap-right";

function pageEntries(page: number, pageCount: number, siblingCount: number): PageEntry[] {
  const wanted = new Set<number>([1, pageCount]);
  for (let p = page - siblingCount; p <= page + siblingCount; p++) {
    if (p >= 1 && p <= pageCount) wanted.add(p);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: PageEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    if (prev != null && current - prev === 2) {
      out.push(prev + 1); // a single hidden page — show it instead of "…"
    } else if (prev != null && current - prev > 2) {
      out.push(current < page ? "gap-left" : "gap-right");
    }
    out.push(current);
  }
  return out;
}

function Arrow({ direction }: { direction: "prev" | "next" }) {
  const d = direction === "prev" ? "M7.5 2.5 4 6l3.5 3.5" : "M4.5 2.5 8 6 4.5 9.5";
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Page-number navigation: prev/next + a windowed number row with ellipses.
 * 1-based; the caller owns the page state.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (pageCount < 1) return null;
  const classes = ["bg-pagination", className].filter(Boolean).join(" ");
  return (
    <nav className={classes} aria-label="Pagination">
      <button
        type="button"
        className="bg-pagination__arrow"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <Arrow direction="prev" />
      </button>
      {pageEntries(page, pageCount, siblingCount).map((entry) =>
        typeof entry === "number" ? (
          <button
            key={entry}
            type="button"
            className={[
              "bg-pagination__page",
              "bg-num",
              entry === page ? "bg-pagination__page--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </button>
        ) : (
          <span key={entry} className="bg-pagination__gap" aria-hidden="true">
            …
          </span>
        )
      )}
      <button
        type="button"
        className="bg-pagination__arrow"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <Arrow direction="next" />
      </button>
    </nav>
  );
}
