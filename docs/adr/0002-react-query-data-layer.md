# ADR-0002: React Query as the frontend data layer

**Date:** 2026-07-31
**Status:** Accepted
**Supersedes:** the `useEffect` + `apiClient` fetching that preceded it

## Context

`@tanstack/react-query` was installed and `QueryClientProvider` was mounted, but there were zero
`useQuery` or `useMutation` call sites. Thirty-eight components fetched inside `useEffect`
instead. Nothing was cached, deduplicated or revalidated, so every navigation refetched from
scratch behind a spinner, and several pages issued the same request twice within one screen.

Two shapes recurred and caused real bugs:

- An effect that wrote back into state it also depended on, to fill in fields the list response
  lacked. That re-renders until the data happens to settle.
- A sequential `for`-await over a collection, issuing one request per item.

A parallel problem sat underneath: `src/services/` existed but nothing imported it, and 31 of its
69 methods pointed at routes that did not exist. Because no component called them, nothing failed.

## Decision

All server state goes through React Query. Specifically:

1. **Query keys come from `src/api/queryKeys.js`.** Never inline. Keys nest from general to
   specific so a mutation can invalidate one detail, every list, or a whole domain.
2. **`unwrap()` in `src/api/queryFn.js` adapts the backend envelopes.** Query functions call a
   service module through it; they do not touch `apiClient`.
3. **URL literals live only in `src/services/*`,** and every path there is checked against its
   controller before use.
4. **`staleTime` is chosen per query** from the `live` / `short` / `medium` / `long` tiers, by how
   fast the data actually goes stale.
5. **Optimistic updates for high-frequency writes only** — voting, commenting, registering,
   joining a team. Each rolls back on failure. Everything else invalidates and refetches.
6. **Forms seeded from server data guard the seed with a ref.** `refetchOnWindowFocus` is on, so an
   ungated seed effect overwrites whatever is being typed.

## Consequences

**Positive**
- Repeat requests collapse: the public and signed-in views of a competition share one cache entry;
  a vote tally read in a list is not re-read by the vote button beside it.
- Fan-outs are explicit — `useQueries` instead of a sequential loop.
- Rewriting `src/services/*` against the controllers found a live defect: the homepage vote button
  had been posting to a `@GetMapping` and failing on every click.

**Negative**
- Tests need a `QueryClientProvider`. `src/Tests/testUtils.jsx` provides `renderWithProviders`,
  which builds a fresh client per test so cache state cannot leak between cases.
- Mutations dispatch asynchronously, so assertions that used to run synchronously after a click
  now need `waitFor`.

**Rejected**
- *Prefetch on hover and seamless pagination.* Real improvements, but a tier above the agreed
  scope. The infrastructure supports adding them later without rework.
- *MSW instead of mocking `apiClient`.* The existing tests already mock `apiClient`, and services
  call through it, so those mocks keep working unchanged. Adding MSW would be new dependency for
  no new coverage.

## Notes

An unused dependency is not a neutral cost. `src/services/` looked like an API layer for months
while being fiction, and `reportWebVitals.js` called functions removed in web-vitals v4 without
anyone noticing, because nothing imported it. Delete unused modules rather than leaving them to be
trusted later.
