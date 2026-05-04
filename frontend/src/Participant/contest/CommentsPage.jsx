/**
 * @file CommentsPage.jsx
 * @description
 * Comment thread page for a submission. Migrated from MUI to shadcn-ready
 * shared Comments components + the useCommentThread hook. Comfortable
 * density for readable threads. Uses sonner for feedback.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CommentList from '@/shared/components/Comments/CommentList';
import CommentForm from '@/shared/components/Comments/CommentForm';
import { useCommentThread } from '@/shared/hooks/useCommentThread';

function CommentsPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  const {
    comments,
    page,
    totalPages,
    loading,
    error,
    postComment,
    editComment,
    deleteComment,
    handlePageChange,
  } = useCommentThread(submissionId);

  const handlePost = async (content) => {
    try {
      await postComment(content);
      toast.success('Comment posted successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to post comment.');
      throw err;
    }
  };

  const handleEdit = async (commentId, content) => {
    try {
      await editComment(commentId, content);
      toast.success('Comment updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to update comment.');
      throw err;
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete comment.');
    }
  };

  const handleReply = async (content, parentId) => {
    try {
      await postComment(content, parentId);
      toast.success('Reply posted.');
    } catch (err) {
      toast.error(err.message || 'Failed to post reply.');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        <h1 className="mb-6 text-3xl font-bold text-foreground">Comments</h1>

        <div className="space-y-6">
          <CommentList
            comments={comments}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            emptyMessage="No comments yet."
          />

          <div className="border-t border-border pt-4">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Add a Comment
            </h2>
            <CommentForm
              label=""
              submitLabel="Post Comment"
              rows={3}
              onSubmit={handlePost}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentsPage;
