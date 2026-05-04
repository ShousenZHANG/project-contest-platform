import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CommentItem from './CommentItem';

/**
 * Renders a paginated list of CommentItems.
 * shadcn rewrite of the previous MUI version. Pagination is rendered as a
 * compact prev/next + numeric strip without bringing in a heavy primitive.
 */
function CommentList({
  comments = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPageChange,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  emptyMessage = 'No comments yet. Be the first to comment!',
}) {
  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8" role="status" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="sr-only">Loading comments…</span>
      </div>
    );
  }

  if (error) {
    return <p className="py-3 text-sm text-destructive">{error}</p>;
  }

  if (comments.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  const handlePage = (next) => {
    if (!onPageChange) return;
    if (next < 1 || next > totalPages) return;
    onPageChange(next);
  };

  return (
    <div>
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
        />
      ))}

      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-center gap-1"
          aria-label="Comment pagination"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const isActive = n === page;
            return (
              <Button
                key={n}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePage(n)}
                aria-current={isActive ? 'page' : undefined}
                className={cn('min-w-9', isActive && 'bg-amber-500 hover:bg-amber-600')}
              >
                {n}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

export default CommentList;
