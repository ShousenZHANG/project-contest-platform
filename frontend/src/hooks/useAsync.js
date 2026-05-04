import { useState, useCallback } from 'react';

/**
 * useAsync — wraps any async operation with loading/error/data state.
 * Replaces scattered useState+useEffect+try-catch patterns.
 *
 * @param {Function} asyncFn - the async function to execute
 * @param {*} initialData - initial data value
 */
export function useAsync(asyncFn, initialData = null) {
  const [state, setState] = useState({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFn(...args);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'An unexpected error occurred';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return { ...state, execute, reset };
}
