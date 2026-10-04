# ADR-0004: Server state belongs to a session lifetime

**Date:** 2026-10-04 · **Status:** Accepted

Private query keys do not all contain account identity, and clearing a QueryClient
does not stop a pending mutation's later rollback callback. A session lifetime is
therefore the boundary for server state: changing token, user ID or role creates
a fresh client and remounts its provider subtree. Email-only edits preserve the
client. The auth module records each identity transition, including logout followed
by login with the same token, so requests from an earlier lifetime remain stale.

The HTTP adapter synchronously captures the session generation and headers when
the request starts. It discards stale responses; only a current token's 401 can
expire the active session. Logout starts server revocation before clearing local
state, without awaiting an unavailable server or allowing its late response to
clear a later account.

We retain the existing login/logout/user/token interface and query-key contract.
The trade-off is losing public cache entries and mounted UI state on an identity
transition. This is preferable to auditing every private key and optimistic
callback separately. Pending mutations that have not passed their asynchronous
onMutate phase are blocked before they can use the next account's credentials;
requests already sent retain their original identity and may finish on the server.
The session lifecycle tests exercise these boundaries through callers.
