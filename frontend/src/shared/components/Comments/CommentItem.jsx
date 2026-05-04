import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import CommentForm from './CommentForm';

/**
 * Renders a single comment with author, timestamp, content, and edit/delete
 * actions when the viewer is the author. Replies are rendered recursively.
 * shadcn rewrite of the previous MUI version.
 */
function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  canReply = true,
}) {
  const [editing, setEditing] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const isOwner = currentUserId && comment.userId === currentUserId;
  const replies = Array.isArray(comment.replies) ? comment.replies : [];

  const handleEditSubmit = async (newContent) => {
    if (!onEdit) return;
    await onEdit(comment.id, newContent);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (onDelete) await onDelete(comment.id);
  };

  const handleReplySubmit = async (content) => {
    if (!onReply) return;
    await onReply(content, comment.id);
    setShowReplyForm(false);
  };

  const initial = comment.userName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="mb-3 rounded-lg bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          {comment.userAvatar && (
            <AvatarImage src={comment.userAvatar} alt={comment.userName || 'User'} />
          )}
          <AvatarFallback className="bg-amber-500 text-white">{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {comment.userName || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
              </p>
            </div>

            {isOwner && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Comment actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

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
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{comment.content}</p>
          )}

          {canReply && onReply && !editing && (
            <button
              type="button"
              onClick={() => setShowReplyForm((v) => !v)}
              className={cn(
                'mt-2 cursor-pointer text-xs font-semibold text-amber-600 hover:underline',
                'focus:outline-none focus-visible:underline'
              )}
            >
              {showReplyForm ? 'Cancel' : 'Reply'}
            </button>
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
            <div className="mt-3 border-l-2 border-amber-200 pl-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommentItem;
