# ADR-0006: One score scale and one authority for competition results

**Date:** 2026-10-04 · **Status:** Accepted

The browser, scoring service and winner selection disagreed about score units,
weights, eligible work and lifecycle. The user confirmed the recommended small
public platform scope, a 0–10 scale with equal weights, and three distinct Judges
per approved Submission.

The backend loads the Submission's actual Competition, current revision and Review,
the configured criteria, and the Judge's current role and assignment. It rejects
missing, duplicate or invented criteria, scores outside 0–10, a mismatched request
Competition, scoring before COMPLETED, and scoring after awarding. Decimal arithmetic
divides the sum by the number of criteria and rounds only the final Judge total to
two places. The browser shows that rule without editable weights.

All APPROVED Submissions, including Team work and entries with no scores, must
qualify before awarding. Each needs three currently assigned Judge accounts scored
on its current revision and scale version. Removing an assignment disqualifies its
score. File replacement increments the revision; older scores remain historical
but do not qualify new work. V2 marks old rows as score schema version zero; old
totals are not silently converted to 0–10.

The Organizer manually starts and ends a Competition. Registration accepts UPCOMING
or ONGOING until its UTC deadline; upload and Review accept ONGOING. Scoring accepts
COMPLETED. Ending freezes Submissions and Review; criteria, type, dates and permitted
file types were already fixed at start. Awarded results and assignments are immutable.
Deadline checks repeat after upload under the lifecycle lock.

Awarding persists each Winner's final score. Ties use competition ranking, such as
1, 1, 3, with stable IDs for presentation. Repeated or concurrent awarding returns
the same committed Winners. A Competition row serializes awarding, scoring, lifecycle
edits and Submission changes. This deliberately uses the existing shared MySQL
schema; it does not imply independent service databases.

Rejected alternatives were browser-owned weights, guessed historical score conversion,
partial awarding while an approved entrant remains unscored, and a new distributed
transaction coordinator. Previously AWARDED legacy competitions stay frozen;
unavailable snapshot scores display as unavailable. Regrading published results
needs a separately reviewed policy.
