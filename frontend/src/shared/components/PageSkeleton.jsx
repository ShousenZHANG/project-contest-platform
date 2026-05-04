import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic page-level skeleton: title, description, three cards, and a stack
 * of rows. Drop in while a route is loading data.
 */
export default function PageSkeleton({ rows = 5 }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-10 w-2/5" />
      <Skeleton className="h-6 w-3/5" />
      <div className="mt-2 flex gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-1/3 rounded-md" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
