import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Textarea + submit button for adding or editing a comment/reply.
 * shadcn rewrite of the previous MUI version. The accent palette is supplied
 * via Tailwind classes that match the rest of the comments UI.
 *
 * @param {object} props
 * @param {string}   [props.label]         field label (default 'Write your comment')
 * @param {string}   [props.initialValue]  pre-filled content (for edit mode)
 * @param {function} props.onSubmit        async (content: string) => void
 * @param {function} [props.onCancel]      if provided a Cancel button is shown
 * @param {string}   [props.submitLabel]   button label (default 'Submit')
 * @param {number}   [props.rows]          textarea rows (default 3)
 */
function CommentForm({
  label = 'Write your comment',
  initialValue = '',
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  rows = 3,
}) {
  const [content, setContent] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) {
      setFieldError('Content cannot be empty.');
      return;
    }
    setFieldError('');
    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {label && <Label className="text-base font-semibold text-foreground">{label}</Label>}
      <textarea
        rows={rows}
        placeholder="Type here..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (fieldError) setFieldError('');
        }}
        aria-invalid={Boolean(fieldError) || undefined}
        className={cn(
          'flex w-full rounded-md border bg-amber-50 px-3 py-2 text-sm shadow-sm transition-colors',
          'border-amber-300 placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          fieldError && 'border-destructive focus-visible:ring-destructive'
        )}
      />
      {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      <div className="mt-1 flex gap-2">
        <Button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="bg-amber-500 text-white hover:bg-amber-600"
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default CommentForm;
