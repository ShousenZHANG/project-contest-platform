import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Standard empty-state placeholder.
 * Pass a lucide-react icon component to customize the glyph.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  description = '',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-14 w-14 text-muted-foreground/60" />
      <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground/80">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
