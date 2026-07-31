import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { commentService } from '../../services/interactionService';
import { queryKeys, staleTime } from '../../api/queryKeys';
import { unwrap, toMessage } from '../../api/queryFn';

const DEFAULT_PAGE_SIZE = 5;

/**
 * Encapsulates all comment data-fetching and mutation for a given submissionId.
 *
 * Posting is optimistic: the comment appears at the top of the first page
 * straight away and is removed again if the request fails. Editing and deleting
 * invalidate rather than patch — a stale edit that silently reverts is more
 * confusing than a brief spinner.
 *
 * @param {string} submissionId
 * @param {{ pageSize?: number }} [options]
 */
export function useCommentThread(submissionId, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const params = { page, size: pageSize, sortBy: 'createdAt', order: 'desc' };
  const listKey = queryKeys.comments.bySubmission(submissionId, params);

  const {
    data,
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => unwrap(commentService.getBySubmission(submissionId, params)),
    enabled: Boolean(submissionId),
    staleTime: staleTime.short,
  });

  const comments = data?.data ?? [];
  const totalPages = data?.pages ?? 1;

  /** Invalidates every page of this submission's thread. */
  const invalidateThread = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.comments.all, 'bySubmission', submissionId],
      }),
    [queryClient, submissionId]
  );

  const post = useMutation({
    mutationFn: ({ content, parentId }) =>
      unwrap(
        commentService.create({
          submissionId,
          content,
          ...(parentId ? { parentId } : {}),
        })
      ),

    onMutate: async ({ content, parentId }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);

      // Only page 1 shows the newest comment, and the list is sorted desc.
      if (page === 1) {
        queryClient.setQueryData(listKey, (current) => {
          const optimistic = {
            id: `optimistic-${Date.now()}`,
            content,
            parentId: parentId ?? null,
            createdAt: new Date().toISOString(),
            pending: true,
          };
          return current
            ? { ...current, data: [optimistic, ...(current.data ?? [])] }
            : current;
        });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },

    onSettled: invalidateThread,
  });

  const edit = useMutation({
    mutationFn: ({ commentId, content }) =>
      unwrap(commentService.update(commentId, { submissionId, content })),
    onSettled: invalidateThread,
  });

  const remove = useMutation({
    mutationFn: (commentId) => unwrap(commentService.delete(commentId)),
    onSettled: invalidateThread,
  });

  const postComment = useCallback(
    async (content, parentId = null) => {
      if (!content.trim()) {
        throw new Error('Comment cannot be empty.');
      }
      setPage(1);
      await post.mutateAsync({ content, parentId });
    },
    [post]
  );

  const editComment = useCallback(
    async (commentId, content) => {
      if (!content.trim()) {
        throw new Error('Content cannot be empty.');
      }
      await edit.mutateAsync({ commentId, content });
    },
    [edit]
  );

  const deleteComment = useCallback(
    async (commentId) => {
      await remove.mutateAsync(commentId);
    },
    [remove]
  );

  const fetchComments = useCallback((pageToFetch = 1) => setPage(pageToFetch), []);

  const handlePageChange = useCallback((_event, value) => setPage(value), []);

  const error =
    (queryError && toMessage(queryError)) ||
    (post.error && toMessage(post.error)) ||
    null;

  return {
    comments,
    page,
    totalPages,
    loading,
    error,
    fetchComments,
    postComment,
    editComment,
    deleteComment,
    handlePageChange,
  };
}
