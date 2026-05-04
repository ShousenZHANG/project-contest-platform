import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Deep server-state hook built on React Query.
 * Replaces scattered useEffect+fetch patterns with cached, deduplicated queries.
 *
 * @param {string[]} queryKey - React Query cache key
 * @param {string} url - API endpoint path
 * @param {object} options - React Query options (enabled, staleTime, etc.)
 */
export function useApiQuery(queryKey, url, options = {}) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(url);
      return response.data;
    },
    staleTime: 30_000,
    ...options,
  });
}

/**
 * Paginated query hook.
 *
 * @param {string} baseKey - cache key prefix
 * @param {string} url - API endpoint
 * @param {{ page: number, size: number }} pagination
 * @param {object} options - extra React Query options
 */
export function usePaginatedQuery(baseKey, url, pagination = { page: 1, size: 10 }, options = {}) {
  const { page, size } = pagination;
  return useQuery({
    queryKey: [baseKey, page, size],
    queryFn: async () => {
      const response = await apiClient.get(url, { params: { page, size } });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  });
}

/**
 * Mutation hook with automatic cache invalidation.
 *
 * @param {Function} mutationFn - async function performing the mutation
 * @param {string[]} invalidateKeys - query keys to invalidate on success
 */
export function useApiMutation(mutationFn, invalidateKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}
