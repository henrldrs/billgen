export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={['bg-pagination', className].filter(Boolean).join(' ')}>
      {totalItems !== undefined && pageSize !== undefined ? (
        <span className="bg-pagination__info bg-num">
          Affichage de {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, totalItems)} sur {totalItems}
        </span>
      ) : null}
      <div className="bg-pagination__actions">
        <button
          type="button"
          className="bg-pagination__btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Précédent
        </button>
        <div className="bg-pagination__pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={[
                'bg-pagination__page',
                'bg-num',
                page === currentPage ? 'bg-pagination__page--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="bg-pagination__btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
