import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination as PaginationData } from '../../types/api';
import { Button } from './ui';

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, totalItems, hasNextPage, hasPreviousPage } = pagination;
  if (totalPages <= 1 && totalItems === 0) return null;
  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-500">
        Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
        <span className="font-semibold text-slate-700">{Math.max(totalPages, 1)}</span>
        <span className="ml-2 text-slate-400">· {totalItems} total</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="px-3"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button
          variant="secondary"
          className="px-3"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
