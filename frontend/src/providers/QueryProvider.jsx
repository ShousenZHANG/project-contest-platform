import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { staleTime } from '../api/queryKeys';

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

const queryClient = createQueryClient();

/**
 * Wrap the app root with this provider to enable React Query throughout.
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
