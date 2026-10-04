# ADR-0008: Separate service identity and private file visibility

**Date:** 2026-10-04 · **Status:** Accepted

Writable internal routes, public Admin signup and raw Submission object URLs could
bypass account privilege, Review and ownership. Public contests require backend
enforcement of these boundaries.

Public signup creates Participant or Organizer. Admin provisions Judge and Admin
through an authenticated endpoint without replacing its own session. A one-time
JDBC CLI creates the first administrator with a strong password; none is shipped.

OAuth accounts use the provider's stable subject and verified email metadata.
An existing local email does not authorize automatic linking; older email-only
OAuth accounts recover through password reset. Judge/Admin accounts use password
login. Provider-bound state is consumed once; callback credentials/errors use a
fragment, cleared before paint, with recoverable login feedback on cancellation.

Internal Feign calls carry a short-lived `X-Service-Authorization` JWT signed with
a secret independent of user JWTs. Receivers check caller, audience, scope and expiry.
Explicit per-client configuration keeps service credentials away from external
OAuth destinations. Annotated internal controllers fail closed. The public gateway
rejects internal and ambiguous paths, disables discovery aliases, and removes client
identity/service headers. Dedicated documentation routes replace automatic aliases.

Public Competition metadata and results reject private contests. Managed reads
derive role, assignment or entrant authority from server identity; Admin inventory
has its own protected endpoint. Public profile reads redact contact details and
internal bulk reads allow explicit service callers. Interactions require public
APPROVED work before ownership/moderation checks. Account/Team deletion preserves
competition and interaction history and protects the last Admin with database locks;
remote availability is not used as evidence that deletion is safe.

The submissions bucket has no anonymous policy, including on existing buckets.
Application controllers stream private files after checking public visibility and
Review, owner or Team, actual Organizer, assigned Judge or Admin. Downloads use
attachment, no-store and nosniff. The browser sends tokens only to validated gateway
download routes, never to raw object URLs or arbitrary origins.

Historical references are parsed only as flat keys in the known bucket; their host
is never fetched. Malformed references require repair. Real old-object privacy
depends on completing the policy cutover against the actual store.

A shared service signing secret is a small-platform tradeoff: a compromised service
can mint another service identity. Per-service keys or workload identity with mTLS
are a future isolation step. Internal service ports and management interfaces stay
inside Compose or loopback; public publishing still needs TLS ingress and managed
production credentials described in the [runbook](../production-readiness-2026-10-04.md).
