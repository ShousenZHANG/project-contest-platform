/**
 * @file DeleteComment.jsx
 * @description
 * Icon button that deletes a comment and notifies via sonner toast.
 * Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/interactionService';
import { queryKeys } from '@/api/queryKeys';
import { unwrap } from '@/api/queryFn';
import { Button } from '@/components/ui/button';
import AuthTokenManager from '@/auth/authTokenManager';


function DeleteComment({ commentId, onDeleted }) {
  const queryClient = useQueryClient();

  const deleteComment = useMutation({
    mutationFn: () => unwrap(commentService.delete(commentId)),
    onSuccess: () => {
      toast.success('Comment deleted successfully!');
      // Only the comment id is in scope here, so the whole comment domain is
      // invalidated rather than one thread.
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      onDeleted?.();
    },
    onError: () => toast.error('Failed to delete comment.'),
  });

  const handleDelete = () => {
    if (!AuthTokenManager.getUserId() || !AuthTokenManager.getToken()) {
      toast.error('Please log in.');
      return;
    }
    deleteComment.mutate();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      aria-label="Delete comment"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

DeleteComment.propTypes = {
  commentId: PropTypes.string.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

export default DeleteComment;
