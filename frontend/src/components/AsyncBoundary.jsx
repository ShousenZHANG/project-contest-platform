import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * AsyncBoundary — wraps async content with unified loading/error states.
 * shadcn rewrite of the previous MUI version.
 *
 * Usage:
 *   <AsyncBoundary loading={loading} error={error} onRetry={refetch}>
 *     <MyContent data={data} />
 *   </AsyncBoundary>
 */
export default function AsyncBoundary({
  loading = false,
  error = null,
  onRetry,
  minHeight = 200,
  children,
}) {
  if (loading) {
    return (
      <div
        className="flex w-full items-center justify-center"
        style={{ minHeight }}
        role="status"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-destructive">
            {typeof error === 'string'
              ? error
              : 'An unexpected error occurred. Please try again.'}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return children;
}
