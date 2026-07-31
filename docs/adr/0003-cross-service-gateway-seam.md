# ADR-0003: A gateway seam in front of cross-service reads

**Date:** 2026-07-31
**Status:** Accepted

## Context

Every service that needed an entity from a sibling service repeated the same four steps: call the
Feign client, take `.getBody()`, decide what null meant, and throw a `BusinessException` with a
hand-picked status and message.

That guard appeared 27 times for competitions alone, across registration-service and
judge-service. The wording had already drifted — `"Competition not found"` and
`"Competition not found."` both existed inside one file. Some sites treated a null body as 404,
one treated it as a silent skip, and the difference was accidental rather than chosen.

The cost showed up most in tests. Proving "a submission is rejected when its competition is gone"
meant stubbing a Feign client, a `ResponseEntity` and a body together. Those branches were
expensive enough to reach that most went untested, which is a large part of why backend branch
coverage sat below 50%.

## Decision

Cross-service reads go through a **gateway** module per remote entity, per consuming service.

The gateway's interface speaks in domain terms and distinguishes three intents:

- `require(id)` — a missing entity ends the request. Throws.
- `find(id)` — absence is a normal outcome the caller handles. Returns `Optional`.
- `findAll(ids)` — batch decoration, where one dead id must not fail the page. Returns a list.

Callers do not see Feign, `ResponseEntity` or HTTP status codes. Operations beyond reads —
`isOrganiser`, `updateStatus` — belong on the gateway too, so `Boolean.TRUE.equals(...getBody())`
stops being written at call sites.

Gateways live in each consuming service (`…/gateway/`), not in `common-lib`, because the Feign
client they wrap is service-specific.

## Consequences

**Positive**
- One place decides what a missing entity means. Changing it is a one-line edit rather than a
  43-site sweep.
- The `find` versus `require` distinction is now explicit at every call site. It used to be
  implicit in whether the author happened to write a null check.
- The gateway is directly testable, and its own tests cover the null-response, blank-id and
  empty-batch branches that were previously only reachable through a caller.

**Negative**
- One more indirection between a service and its Feign client. Justified where the guard repeats;
  a gateway wrapping a single call site would be shallow — do not add one there.
- Existing fallback classes under `feign/fallback/` still return nulls that the gateway then
  re-interprets. That is two places expressing the same policy. Folding the fallbacks into the
  gateway is worth doing and has not been done.

## Scope note

The review that produced this ADR also proposed splitting orchestration from persistence in the
large service impls, on the premise that gateways would shrink them enough to make the split
obvious. In practice they removed roughly 30 lines from 800. That refactor is a much larger piece
of work than the premise implied, and remains open. The one seam taken from it —
`ParticipantAnalyticsService`, mirroring the existing `SubmissionAnalyticsService` — was clean and
self-contained; the rest is not, yet.
