import { useState, useCallback, useEffect } from 'react';
import apiClient from '../../api/apiClient';

const PAGE_SIZE = 5;

/**
 * Encapsulates all comment data-fetching and mutation for a given submissionId.
 *
 * @param {string} submissionId
 */
export function useCommentThread(submissionId) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(
    async (pageToFetch = 1, reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get('/interactions/comments/list', {
          params: {
            submissionId,
            page: pageToFetch,
            size: PAGE_SIZE,
            sortBy: 'createdAt',
            order: 'desc',
          },
        });
        const fetched = res.data.data || [];
        const pages = res.data.pages || 1;
        setTotalPages(pages);
        setPage(pageToFetch);
        if (reset) {
          setComments(fetched);
        } else {
          setComments((prev) => [...prev, ...fetched]);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to fetch comments.');
      } finally {
        setLoading(false);
      }
    },
    [submissionId]
  );

  useEffect(() => {
    if (submissionId) {
      fetchComments(1, true);
    }
  }, [submissionId, fetchComments]);

  const postComment = useCallback(
    async (content, parentId = null) => {
      if (!content.trim()) {
        throw new Error('Comment cannot be empty.');
      }
      await apiClient.post('/interactions/comments', {
        submissionId,
        content,
        ...(parentId ? { parentId } : {}),
      });
      await fetchComments(1, true);
    },
    [submissionId, fetchComments]
  );

  const editComment = useCallback(
    async (commentId, content) => {
      if (!content.trim()) {
        throw new Error('Content cannot be empty.');
      }
      await apiClient.put(`/interactions/comments/${commentId}`, {
        submissionId,
        content,
      });
      await fetchComments(1, true);
    },
    [submissionId, fetchComments]
  );

  const deleteComment = useCallback(
    async (commentId) => {
      await apiClient.delete(`/interactions/comments/${commentId}`);
      await fetchComments(1, true);
    },
    [fetchComments]
  );

  const handlePageChange = useCallback(
    (_event, value) => {
      fetchComments(value, true);
    },
    [fetchComments]
  );

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
