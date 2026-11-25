import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

type PaginationBarProps = {
  label: string;
  pagination: Pagination;
  itemCount: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({ label, pagination, itemCount, onPageChange }: PaginationBarProps) {
  const { page, limit, total, totalPages } = pagination;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = (page - 1) * limit + itemCount;

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-center justify-between gap-2 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
