import React, { useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CommentForm from './CommentForm';

const ACCENT = '#FF9800';

/**
 * Renders a single comment with author, timestamp, content, and edit/delete
 * actions when the viewer is the author. Replies are rendered recursively.
 *
 * @param {object} props
 * @param {object}   props.comment           - { id, content, userName, userAvatar, userId, createdAt, replies? }
 * @param {string}   [props.currentUserId]   - viewer's user id (for owner gating)
 * @param {function} [props.onEdit]          - async (commentId, content) => void
 * @param {function} [props.onDelete]        - async (commentId) => void
 * @param {function} [props.onReply]         - async (content, parentId) => void
 * @param {boolean}  [props.canReply]        - whether to show reply UI (default true)
 */
function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  canReply = true,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const isOwner = currentUserId && comment.userId === currentUserId;
  const replies = Array.isArray(comment.replies) ? comment.replies : [];

  const closeMenu = () => setMenuAnchor(null);

  const handleEditSubmit = async (newContent) => {
    if (!onEdit) return;
    await onEdit(comment.id, newContent);
    setEditing(false);
  };

  const handleDelete = async () => {
    closeMenu();
    if (onDelete) await onDelete(comment.id);
  };

  const handleReplySubmit = async (content) => {
    if (!onReply) return;
    await onReply(content, comment.id);
    setShowReplyForm(false);
  };

  return (
    <Box
      sx={{
        p: 2,
        mb: 1.5,
        bgcolor: '#fff8e1',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Avatar
          src={comment.userAvatar}
          alt={comment.userName}
          sx={{ width: 36, height: 36, bgcolor: ACCENT }}
        >
          {comment.userName?.[0]?.toUpperCase() || 'U'}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#222' }}>
                {comment.userName || 'Anonymous'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                {comment.createdAt
                  ? new Date(comment.createdAt).toLocaleString()
                  : ''}
              </Typography>
            </Box>

            {isOwner && (onEdit || onDelete) && (
              <>
                <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                >
                  {onEdit && (
                    <MenuItem
                      onClick={() => {
                        setEditing(true);
                        closeMenu();
                      }}
                    >
                      Edit
                    </MenuItem>
                  )}
                  {onDelete && <MenuItem onClick={handleDelete}>Delete</MenuItem>}
                </Menu>
              </>
            )}
          </Box>

          {editing ? (
            <CommentForm
              label=""
              initialValue={comment.content}
              submitLabel="Save"
              rows={2}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{ mt: 1, whiteSpace: 'pre-wrap', color: '#333' }}
            >
              {comment.content}
            </Typography>
          )}

          {canReply && onReply && !editing && (
            <Box sx={{ mt: 1 }}>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: ACCENT,
                  cursor: 'pointer',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => setShowReplyForm((v) => !v)}
              >
                {showReplyForm ? 'Cancel' : 'Reply'}
              </Typography>
            </Box>
          )}

          {showReplyForm && (
            <CommentForm
              label=""
              submitLabel="Post Reply"
              rows={2}
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
            />
          )}

          {replies.length > 0 && (
            <Box sx={{ mt: 1.5, pl: 2, borderLeft: '2px solid #FFE0B2' }}>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  canReply={false}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default CommentItem;
