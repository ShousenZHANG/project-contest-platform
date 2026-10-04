import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pagination({ page, pages = 1, total, onPageChange, busy = false }) {
  const last = Math.max(1, pages);
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-muted-foreground"
      >
        {total != null ? `${total} results · ` : ''}Page {page} of {last}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy || page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy || page >= last}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
