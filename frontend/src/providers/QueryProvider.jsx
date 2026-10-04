import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CanceledError } from 'axios';
import { staleTime } from '../api/queryKeys';
import AuthTokenManager from '../auth/authTokenManager';

/** HTTP statuses where retrying cannot help — the request itself is the problem. */
const NON_RETRYABLE = new Set([400, 401, 403, 404, 409, 422]);

function statusOf(error) {
  return error?.response?.status ?? error?.status;
}

/**
 * Build a QueryClient with the app's defaults.
 *
 * Exported so tests can create an isolated client per test case rather than
 * sharing cache state between them.
 */
export function createQueryClient(overrides = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Most screens read lists that move as people register, submit and
        // score. Longer-lived data raises this per query via `staleTime.medium`
        // or `staleTime.long`.
        staleTime: staleTime.short,

        // Keep evicted queries around long enough that going back to a page
        // renders from cache instead of flashing a skeleton.
        gcTime: 15 * 60_000,

        // Coming back to the tab should show current data, not whatever was
        // true when it was last opened.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        retry: (failureCount, error) =>
          !NON_RETRYABLE.has(statusOf(error)) && failureCount < 2,
      },
      mutations: {
        retry: 0,
      },
    },
    ...overrides,
  });
}

/**
 * Own server state for one session. Replacing the client also isolates late
 * mutation callbacks: an old optimistic rollback can only write to its old cache.
 */
export function QueryProvider({ children }) {
  const [scope, setScope] = useState(() => ({
    version: AuthTokenManager.getSessionVersion(),
    client: createQueryClient(),
  }));
  const currentScope = useRef(scope);

  useEffect(() => {
    const resetForSession = () => {
      const version = AuthTokenManager.getSessionVersion();
      if (version === currentScope.current.version) return;
      const previous = currentScope.current.client;
      // An optimistic onMutate may still be awaiting work before its HTTP call.
      // Stop it from starting later with the next account's credentials.
      for (const mutation of previous.getMutationCache().getAll()) {
        if (mutation.state.status !== 'pending') continue;
        mutation.setOptions({
          ...mutation.options,
          mutationFn: () => Promise.reject(new CanceledError('The session changed')),
        });
      }
      previous.clear();
      const next = { version, client: createQueryClient() };
      currentScope.current = next;
      setScope(next);
    };
    const unsubscribe = AuthTokenManager.subscribe(resetForSession);
    // A child can log in from its mount effect before this subscription starts.
    resetForSession();
    return unsubscribe;
  }, []);

  return (
    <QueryClientProvider key={scope.version} client={scope.client}>
      {children}
    </QueryClientProvider>
  );
}
