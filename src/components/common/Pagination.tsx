interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Con pocas páginas se muestran todas; con muchas, una ventana alrededor
// de la actual + primera/última, con "…" en el medio — evita renderizar
// cientos de botones si el total de páginas crece mucho.
function getPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const numbers = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...numbers].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(n);
  });
  return result;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label='Paginación' className='flex items-center gap-1.5'>
      <button
        type='button'
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label='Página anterior'
        className='px-3 py-1.5 rounded-full border border-border text-foreground disabled:opacity-40'
      >
        Anterior
      </button>

      {getPageNumbers(page, totalPages).map((n, i) =>
        n === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className='px-1.5 text-muted'>
            …
          </span>
        ) : (
          <button
            key={n}
            type='button'
            onClick={() => onPageChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Página ${n}`}
            className={
              n === page
                ? 'w-8 h-8 rounded-full bg-turquoise-blue-500 text-white text-sm font-semibold'
                : 'w-8 h-8 rounded-full border border-border text-foreground text-sm'
            }
          >
            {n}
          </button>
        ),
      )}

      <button
        type='button'
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label='Página siguiente'
        className='px-3 py-1.5 rounded-full border border-border text-foreground disabled:opacity-40'
      >
        Siguiente
      </button>
    </nav>
  );
}
