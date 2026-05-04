/**
 * @file ProjectComment.jsx
 * @description
 * Inline comment composer + dialog showing existing comments for a submission.
 * Migrated from MUI to shadcn/ui + Tailwind. Uses sonner for feedback.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

function ProjectComment({ submissionId }) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    setCommentsLoading(true);
    apiClient
      .get('/interactions/comments/list', {
        params: {
          submissionId,
          page: 1,
          size: 10,
          sortBy: 'createdAt',
          order: 'desc',
        },
      })
      .then((res) => setComments(res.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [submissionId]);

  const handleAddComment = async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      toast.error('User not logged in. Cannot post comment.');
      return;
    }

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
      toast.success('Comment posted successfully!');
      setNewComment('');
      setCommentsOpen(true);
    } catch {
      toast.error('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-5 space-y-3 text-center">
        <Label htmlFor="project-comment-input" className="sr-only">
          Add a Comment
        </Label>
        <textarea
          id="project-comment-input"
          rows={4}
          placeholder="Add a Comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button onClick={handleAddComment} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Post Comment
        </Button>
      </div>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comment list</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There are no comments for the moment.
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id || comment.id} className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {comment.authorName || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-foreground">{comment.content}</p>
                  {comment.replies?.length > 0 && (
                    <div className="ml-5 space-y-2 border-l-2 border-border pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply._id || reply.id} className="space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">
                            {reply.authorName || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm text-foreground">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator className="my-2" />
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProjectComment;
