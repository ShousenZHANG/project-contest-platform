import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toMessage } from '@/api/queryFn';

export default function PageError({ error, onRetry, retrying = false }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      <p className="flex items-start gap-2 text-destructive">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {toMessage(error)}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-11"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      )}
    </div>
  );
}
