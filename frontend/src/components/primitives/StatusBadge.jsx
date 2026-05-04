import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT = {
  UPCOMING: 'default',
  ONGOING: 'success',
  ENDED: 'secondary',
  COMPLETED: 'secondary',
  AWARDED: 'success',
  CANCELLED: 'destructive',
};

/**
 * Status pill for competition / submission statuses.
 * Wraps shadcn Badge with status-keyed variants.
 */
export default function StatusBadge({ status, label, className }) {
  const key = (status || '').toUpperCase();
  const variant = STATUS_VARIANT[key] || 'outline';
  return (
    <Badge variant={variant} className={className}>
      {label ?? status}
    </Badge>
  );
}
