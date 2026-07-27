/**
 * testUtils.jsx
 *
 * Shared render helper for component tests.
 *
 * Every call builds its own QueryClient, so no cache state leaks from one test
 * into the next — a shared client makes tests pass or fail depending on the
 * order they happen to run in.
 *
 *   import { renderWithProviders } from '../testUtils';
 *
 *   renderWithProviders(<ContestList />);
 *   renderWithProviders(<ContestDetail />, {
 *     route: '/contest-detail/42',
 *     routePath: '/contest-detail/:id',
 *   });
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * A QueryClient tuned for tests: no retries and no background refetching, so a
 * rejected mock surfaces immediately instead of being retried past the timeout.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Render `ui` inside a router and a fresh QueryClient.
 *
 * @param {React.ReactElement} ui
 * @param {object} [options]
 * @param {string} [options.route] - Location to start at. Defaults to '/'.
 * @param {string} [options.routePath] - Route pattern, when the component reads
 *   params via `useParams`. Without it, `ui` renders directly.
 * @param {QueryClient} [options.queryClient] - Supply your own client to assert
 *   on cache contents.
 * @returns Testing Library's result, plus the `queryClient` in use.
 */
export function renderWithProviders(ui, options = {}) {
  const {
    route = '/',
    routePath,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {routePath ? (
            <Routes>
              <Route path={routePath} element={children} />
            </Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export default renderWithProviders;
