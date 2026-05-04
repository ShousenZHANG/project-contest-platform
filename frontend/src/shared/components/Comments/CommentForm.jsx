import React, { useState } from 'react';
import { Button, TextField, Typography } from '@mui/material';

const ACCENT = '#FF9800';

/**
 * Textarea + submit button for adding or editing a comment/reply.
 *
 * @param {object} props
 * @param {string}   [props.label]         - field label (default 'Write your comment')
 * @param {string}   [props.initialValue]  - pre-filled content (for edit mode)
 * @param {function} props.onSubmit        - async (content: string) => void
 * @param {function} [props.onCancel]      - if provided a Cancel button is shown
 * @param {string}   [props.submitLabel]   - button label (default 'Submit')
 * @param {number}   [props.rows]          - textarea rows (default 3)
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
    <div style={{ marginTop: '12px' }}>
      {label && (
        <Typography variant="h6" sx={{ mb: 1, color: 'black' }}>
          {label}
        </Typography>
      )}
      <TextField
        fullWidth
        multiline
        rows={rows}
        placeholder="Type here..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (fieldError) setFieldError('');
        }}
        variant="outlined"
        error={Boolean(fieldError)}
        helperText={fieldError}
        sx={{
          mb: 1,
          bgcolor: '#fff8e1',
          borderRadius: '8px',
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#FFB74D' },
            '&:hover fieldset': { borderColor: '#FFA726' },
            '&.Mui-focused fieldset': { borderColor: '#FB8C00', borderWidth: '2px' },
          },
          '& .MuiInputLabel-root': { color: '#FB8C00', fontWeight: 'bold' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#E65100' },
        }}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={handleSubmit}
          sx={{ backgroundColor: ACCENT, '&:hover': { backgroundColor: '#e68900' } }}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              color: ACCENT,
              borderColor: ACCENT,
              '&:hover': { backgroundColor: 'rgba(255,152,0,0.1)', borderColor: '#e68900', color: '#e68900' },
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default CommentForm;
