# Domain model

The vocabulary of the Competition platform. Implementation maps live in
[docs/CODEMAPS](docs/CODEMAPS/README.md). Use these terms in code, interfaces and issues.

## Actors

| Role | Responsibility |
| --- | --- |
| Participant | Registers individually or with a Team, submits work, votes and comments |
| Organizer | Creates and runs a Competition, assigns Judges, reviews Submissions |
| Judge | Scores approved Submissions in Competitions to which they are assigned |
| Admin | Provisions privileged accounts and manages the platform |

Each account has one fixed role. Public signup offers Participant and Organizer.
Judge and Admin accounts require an Admin. An Organizer cannot judge their own
Competition; assigning a Judge requires an account whose role is Judge.

## Competition

A contest owned by an Organizer. Its participation type is INDIVIDUAL or TEAM;
Registration and Submission must match that type.

The Organizer explicitly advances **UPCOMING → ONGOING → COMPLETED → AWARDED**.
An unfinished Competition may instead be CANCELED. AWARDED and CANCELED are final.

Registration is open in UPCOMING and ONGOING until the deadline. Upload and Review
are open only in ONGOING. Scoring and awarding are open only in COMPLETED. The
deadline closes registrations and uploads even if the Organizer has not ended
the Competition. Ending freezes its Submissions and Review decisions.

Scoring criteria, participation type, dates and allowed file types are fixed once
the Competition starts. Awarding freezes results and Judge assignments.

An Organizer's Competitions use the published `/competitions/achieve/my` contract.
“achieve” is historical spelling, not a new domain term.

## Registration

A Participant or Team entering a Competition. Individual Registration belongs to
a Participant; Team Registration belongs to a Team. Only a Team's creator may
register or withdraw it. Organizer removal and Participant withdrawal are distinct
operations with different notifications. Completed Registration history is retained.

## Team

A group of Participants owned by its creator. A Team exists independently of a
Competition. Its creator manages membership and Registration, and cannot leave
their own Team.

## Submission

A Participant's or Team's work entered after Registration. There is one current
Submission per entrant per Competition. Replacing its file creates a new
**Submission revision**, clears Review and displayed total, and requires fresh
Review and Score decisions. Earlier revision scores do not qualify the current work.

The historical entity `SubmissionRecords` means Submission. Use Submission in new
domain names and prose.

Files are private. The owner or Team, the Competition's Organizer, an assigned
Judge for approved work, and Admin have access. An APPROVED Submission in a public
Competition may also be downloaded publicly. Public galleries include approved
individual and Team work and omit internal Review comments.

## Review

An Organizer's admissibility decision: PENDING, APPROVED or REJECTED. A Review is
different from a Score. Only APPROVED work can be scored or appear publicly.
Review decisions freeze when the Competition enters COMPLETED.

## Score and Scoring criterion

A Scoring criterion is a distinct label configured before the Competition starts.
A Judge scores every criterion on a **0–10 scale**. The Judge's total is the equal
arithmetic mean, rounded once to two decimal places.

A Submission's final score is the mean of its current valid Judges' totals.
Each assigned Judge contributes once per current revision. Legacy scores without
a known scale are not treated as current 0–10 scores; unfinished Competitions need
rescoring. A missing score means unavailable, not zero.

## Award eligibility and Winner

Every APPROVED Submission needs scores from at least **three distinct valid assigned
Judges** before automatic awarding. One incomplete approved entry blocks the whole
Competition.

A Winner is an immutable automatic-awarding result. Ranking uses final totals and
competition ranking for ties: 1, 1, 3. Repeated awarding creates no new Winners.
There is no manual score override. Prefer Winner for the record and awarding for
the act; `SubmissionWinners` and `AwardNotifier` are historical implementation names.

## Interaction

A vote or comment on a Submission. A Participant may vote once per Submission;
a duplicate vote is a conflict. Interaction does not determine the Judge score.

## Notification

A recorded consequence: Judge assigned or removed, Registration accepted or removed,
Submission uploaded or reviewed, or Winner selected. A committed action retains its
Notification for retry after a delivery failure. Email may arrive more than once
after an ambiguous SMTP result.

## Decisions on record

- [ADR-0001](docs/adr/0001-frontend-design-system.md): frontend design system.
- [ADR-0002](docs/adr/0002-react-query-data-layer.md): query and mutation contracts.
- [ADR-0003](docs/adr/0003-cross-service-gateway-seam.md): cross-service gateway seam.
- [ADR-0004](docs/adr/0004-session-lifetime-boundary.md): account session lifetime.
- [ADR-0005](docs/adr/0005-notification-wire-contracts.md): historical notification wire IDs.
- [ADR-0006](docs/adr/0006-scoring-and-competition-lifecycle.md): score and lifecycle invariants.
- [ADR-0007](docs/adr/0007-durable-domain-effects.md): external effects and migrations.
- [ADR-0008](docs/adr/0008-service-credentials-and-private-submissions.md): service credentials and files.
