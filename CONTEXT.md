# Domain model

The vocabulary this codebase runs on. Where two names exist for one idea, the winner is stated
and the loser is named so you can recognise it in the wild.

Keep this file current. If you introduce a term, add it here; if you sharpen one, edit it here.

---

## Actors

Four roles, carried on every authenticated request as the `User-Role` header and read through
`RequestContext` in `common-lib`.

| Role | Does |
|---|---|
| **Participant** | Registers for competitions, submits work, votes and comments |
| **Organizer** | Creates and runs competitions, assigns judges, reviews submissions |
| **Judge** | Scores submissions they are assigned to |
| **Admin** | Manages accounts and reads platform-wide reporting |

A person's role is fixed per account. Organizers do not judge their own competitions; the
`Registration` and `Judge assignment` paths both refuse that overlap.

---

## Core terms

### Competition
The central aggregate. Owned by an Organizer, lives in `competition-service`.

Moves through **UPCOMING → ONGOING → COMPLETED → AWARDED**, and can be **CANCELED** from any of
them (`CompetitionStatus`). Two of these gate behaviour rather than just describing it:

- Registration is only allowed while UPCOMING or ONGOING (`CompetitionStatus.isRegistrable`)
- Winners can only be awarded once COMPLETED; awarding moves it to AWARDED

A Competition is either **INDIVIDUAL** or **TEAM** (`ParticipationType`). That choice decides
whether Registrations attach to a User or to a Team, and it cannot be mixed.

> **Naming trap.** An Organizer's own competitions are served from
> `GET /competitions/achieve/my`. "achieve" is a misspelling of "archive" that reached the
> published contract and is now permanent. Do not repeat it in new endpoints; do not rename it in
> the old one.

### Registration
A Participant, or a Team, entering a Competition. Lives in `registration-service`.

Two shapes, deliberately separate rather than unified:

- **Individual registration** — `competition_participants`, one row per user per competition
- **Team registration** — `competition_teams`, one row per team per competition

Only a Team's creator may register it. An Organizer can remove either kind, which is a different
operation from a Participant cancelling their own — the notification differs, so the two are
distinct methods rather than one with a flag.

### Submission
A Participant's or Team's entry into a Competition. One per participant per competition; a new
upload replaces the old file.

> **Naming trap.** The persistent entity is `SubmissionRecords`; the value objects are
> `SubmissionInfoVO`, `SubmissionResponseVO`. In prose and in new names, use **Submission**.
> `SubmissionRecord` is the table's name, not the domain's.

Carries a **review status** — `PENDING`, `APPROVED` or `REJECTED` — set by an Organizer, not a
Judge. Only APPROVED submissions appear in public galleries.

### Review vs Score
Two different judgements, easily confused because both produce a "status" on a Submission:

- **Review** — an *Organizer* deciding whether a Submission is admissible. Produces the review
  status above.
- **Score** — a *Judge* rating an admissible Submission against the Competition's scoring
  criteria. Produces `submission_judge_scores` rows and a `totalScore`.

A Submission can be APPROVED and unscored. It cannot be scored without being APPROVED.

### Scoring criterion
A free-text label on the Competition (`scoringCriteria`). Judges score each criterion; the total
is the weighted mean, with weights currently equal — `1.0 / criteria.size()`, decided at the call
site, not stored.

### Winner
A Submission selected for an award once a Competition is COMPLETED. Lives in `judge-service`.

Selection is **automatic** — `POST /winners/auto-award` ranks by total score. There is no manual
override. The endpoint reads as an action, not a resource, because it is one.

> **Naming trap.** "Award" and "Winner" are the same idea. The entity is `SubmissionWinners`, the
> notifier is `AwardNotifier`. Prefer **Winner** for the record and **awarding** for the act.

### Team
A group of Participants, owned by its creator. Lives in `user-service`, not
`registration-service`, because a Team exists independently of any Competition.

Only the creator can edit it, delete it, remove members, or register it for a Competition. A
creator cannot leave their own team.

### Interaction
Votes and comments on a Submission. Lives in `interaction-service`. One vote per user per
submission; a second vote is a 409, not an error the user needs to see.

---

## Service boundaries

| Service | Port | Owns |
|---|---|---|
| api-gateway | 8080 | JWT validation, routing, identity headers |
| user-service | 8081 | Users, roles, OAuth, Teams |
| competition-service | 8082 | Competitions, organizer and judge assignment |
| file-service | 8083 | MinIO objects |
| registration-service | 8084 | Registrations, Submissions, participant reporting |
| interaction-service | 8085 | Votes, comments |
| judge-service | 8086 | Scores, Winners, dashboards |

Cross-service reads go through a **gateway** — see `CompetitionGateway` in registration-service
and judge-service. Callers do not touch Feign clients, `ResponseEntity` or HTTP status codes
directly; the gateway decides what a missing entity means.

---

## Conventions

**Response envelope.** Most endpoints return `ApiResponse<T>` (`{ success, data, error }`) from
`common-lib`. Three exceptions, all deliberate:

- Paged reads return `PageResponse<T>` (`{ data, total, page, pages }`) with no envelope
- Internal (`/internal/**`) endpoints return bare values, since only Feign reads them
- file-service returns raw URL strings, for Feign and browser compatibility

The frontend's `unwrap()` in `src/api/queryFn.js` handles all four shapes.

**Errors.** `BusinessException(HttpStatus, message)` from `common-lib`, translated by
`GlobalExceptionHandler`. Domain failures carry their own status; do not wrap them in 500s.

**Reporting is separate from writing.** `SubmissionAnalyticsService` and
`ParticipantAnalyticsService` hold the read-only counting and trending. Registration and
submission services hold the writes. Add new reports to the analytics services.

---

## Frontend vocabulary

**Query keys** come from `src/api/queryKeys.js` and nowhere else. Two spellings of one key are two
cache entries that drift apart silently.

**Service modules** in `src/services/` are the only place a URL literal belongs. Every path there
is checked against its controller — several were not, once, and pointed at routes that had never
existed.

**staleTime tiers** — `live` (vote counts), `short` (lists), `medium` (detail pages), `long`
(profiles). Pick by how fast the data actually goes stale.

---

## Decisions on record

`docs/adr/` holds decisions that should not be re-litigated:

- **ADR-0001** — the shadcn/ui + Tailwind design system, and the twelve design choices behind it
- **ADR-0002** — data fetching on React Query, with the query-key contract and optimistic-write policy
- **ADR-0003** — the cross-service gateway seam
