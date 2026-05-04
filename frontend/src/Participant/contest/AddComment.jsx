/**
 * @file AddComment.jsx
 * @description
 * Lets a participant post a top-level comment on a submission.
 * Migrated from MUI to shadcn/ui + Tailwind. Uses sonner for feedback.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function AddComment({ submissionId, onCommentPosted }) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/interactions/comments', {
        submissionId,
        content: newComment,
      });
      setNewComment('');
      onCommentPosted?.();
      toast.success('Comment added successfully!');
    } catch {
      toast.error('Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Add a Comment</h2>
      <div className="space-y-2">
        <Label htmlFor="add-comment-textarea" className="sr-only">
          Write your comment
        </Label>
        <textarea
          id="add-comment-textarea"
          rows={3}
          placeholder="Type your thoughts here..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button onClick={handlePostComment} disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Post Comment
      </Button>
    </section>
  );
}

export default AddComment;
