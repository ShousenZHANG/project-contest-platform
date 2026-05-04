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
import apiClient from '@/api/apiClient';
import { Button } from '@/components/ui/button';

function DeleteComment({ commentId, onDeleted }) {
  const handleDelete = async () => {
    const currentUserId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!currentUserId || !token) {
      toast.error('Please log in.');
      return;
    }

    try {
      await apiClient.delete(`/interactions/comments/${commentId}`);
      toast.success('Comment deleted successfully!');
      onDeleted?.();
    } catch {
      toast.error('Failed to delete comment.');
    }
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
