import React from 'react';
import { Box, CircularProgress, Pagination, Typography } from '@mui/material';
import CommentItem from './CommentItem';

/**
 * Renders a paginated list of CommentItems.
 *
 * @param {object} props
 * @param {Array}    props.comments         - list returned by useCommentThread
 * @param {boolean}  [props.loading]
 * @param {string}   [props.error]
 * @param {number}   [props.page]
 * @param {number}   [props.totalPages]
 * @param {function} [props.onPageChange]
 * @param {string}   [props.currentUserId]
 * @param {function} [props.onEdit]
 * @param {function} [props.onDelete]
 * @param {function} [props.onReply]
 * @param {string}   [props.emptyMessage]   - shown when not loading and list empty
 */
function CommentList({
  comments = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPageChange,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  emptyMessage = 'No comments yet. Be the first to comment!',
}) {
  if (loading && comments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" sx={{ color: 'error.main', py: 2 }}>
        {error}
      </Typography>
    );
  }

  if (comments.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#888', py: 2, textAlign: 'center' }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box>
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
        />
      ))}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={onPageChange}
            color="warning"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}

export default CommentList;
