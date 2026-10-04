# Backend code map

Updated 2026-10-04. Seven executable services and common-lib remain; generated
`target` output is excluded from inventory. Runtime uses Java 25 / Boot 4.1.
The [runbook](../production-readiness-2026-10-04.md) records actual test/infra evidence.

## Domain entry points

| Domain | Read/write authority | Important rules |
| --- | --- | --- |
| Identity | [UsersServiceImpl](../../backend/user-service/src/main/java/com/w16a/danish/user/service/impl/UsersServiceImpl.java), [UsersController](../../backend/user-service/src/main/java/com/w16a/danish/user/controller/UsersController.java) | Public Participant/Organizer only; Admin provisioning of Judge/Admin preserves caller session |
| First Admin | [AdminBootstrap](../../backend/user-service/src/main/java/com/w16a/danish/user/bootstrap/AdminBootstrap.java) | Explicit CLI, no existing Admin, strong password, JDBC transaction |
| Teams | [TeamServiceImpl](../../backend/user-service/src/main/java/com/w16a/danish/user/service/impl/TeamServiceImpl.java) | Creator manages membership and registration; Team existence is independent of Competition |
| Competition | [CompetitionsServiceImpl](../../backend/competition-service/src/main/java/com/w16a/danish/competition/service/impl/CompetitionsServiceImpl.java), [CompetitionLifecycle](../../backend/competition-service/src/main/java/com/w16a/danish/competition/domain/CompetitionLifecycle.java) | Ownership, valid criteria/dates/type, explicit lifecycle, frozen rules and finalized run |
| Registration | [CompetitionParticipantsServiceImpl](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl/CompetitionParticipantsServiceImpl.java) | Matching entrant/type, registration/UTC deadline, creator-owned Team, current-status lock for cancel/remove |
| Submission / Review | [SubmissionRecordsServiceImpl](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl/SubmissionRecordsServiceImpl.java) | Registered upload, Team registration, ONGOING writes, second deadline check, revision and persisted null reset |
| Private download | [SubmissionDownloads](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/SubmissionDownloads.java), [SubmissionDownloadController](../../backend/registration-service/src/main/java/com/w16a/danish/registration/controller/SubmissionDownloadController.java) | Object-level authorization, flat known key, streamed attachment, no-store/nosniff |
| Score | [SubmissionJudgesServiceImpl](../../backend/judge-service/src/main/java/com/w16a/danish/judge/service/impl/SubmissionJudgesServiceImpl.java) | Actual Competition, APPROVED current revision, assigned Judge role, exact criteria and server-owned mean |
| Award | [SubmissionWinnersServiceImpl](../../backend/judge-service/src/main/java/com/w16a/danish/judge/service/impl/SubmissionWinnersServiceImpl.java) | Every approved entry has 3 valid Judges, persisted serialization/idempotence, 1/1/3 ties, score snapshot |
| Interaction | [interaction service implementations](../../backend/interaction-service/src/main/java/com/w16a/danish/interaction/service/impl) | Vote uniqueness, comment ownership and moderation |
| Reporting | [registration analytics](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl), [judge dashboards](../../backend/judge-service/src/main/java/com/w16a/danish/judge/service/impl) | Read models remain separate from Submission/Registration writes |
| Objects | [file-service](../../backend/file-service/src/main/java/com/w16a/danish/fileService) | Caller-scoped upload/delete, private submissions policy, internal streamed read |

## API contracts to inspect

| Contract | Controller |
| --- | --- |
| Public registration, login, Admin accounts | [UsersController](../../backend/user-service/src/main/java/com/w16a/danish/user/controller/UsersController.java) |
| Public list + participationType, Organizer server filters | [CompetitionsController](../../backend/competition-service/src/main/java/com/w16a/danish/competition/controller/CompetitionsController.java) |
| Individual/Team register, cancel and removal | [CompetitionParticipantsController](../../backend/registration-service/src/main/java/com/w16a/danish/registration/controller/CompetitionParticipantsController.java) |
| Upload, Review, public approved list, internal approved reads and versioned projection | [SubmissionRecordsController](../../backend/registration-service/src/main/java/com/w16a/danish/registration/controller/SubmissionRecordsController.java) |
| Private Team detail | [TeamSubmissionDetailController](../../backend/registration-service/src/main/java/com/w16a/danish/registration/controller/TeamSubmissionDetailController.java) |
| Judge context, current detail, pending work, POST/PUT score | [SubmissionJudgesController](../../backend/judge-service/src/main/java/com/w16a/danish/judge/controller/SubmissionJudgesController.java) |
| Eligibility, auto-award and public results | [SubmissionWinnersController](../../backend/judge-service/src/main/java/com/w16a/danish/judge/controller/SubmissionWinnersController.java) |

## Trust and cross-service calls

[JwtAuthFilter](../../backend/api-gateway/src/main/java/com/w16a/danish/gateway/filters/JwtAuthFilter.java)
verifies browser JWTs and supplies identity. [RequestContext](../../backend/common-lib/src/main/java/com/w16a/danish/common/context/RequestContext.java)
provides role guards. The scoped [security module](../../backend/common-lib/src/main/java/com/w16a/danish/common/security)
verifies independent service credentials for internal routes. Explicit Feign client
configuration avoids sending credentials to external OAuth providers.

Public profile reads redact contact details. Internal user/team lookups have
explicit caller allowlists; POST read batches retain read scope and a limit of
100 IDs, with larger domain lists split at the service seam. Dependency failures
return a recoverable service error rather than empty authorization/history data.
Public, managed and Admin Competition reads are separate contracts.

[CompetitionGateway in registration](../../backend/registration-service/src/main/java/com/w16a/danish/registration/gateway/CompetitionGateway.java)
and [CompetitionGateway in judging](../../backend/judge-service/src/main/java/com/w16a/danish/judge/gateway/CompetitionGateway.java)
hide Feign transport/missing-state interpretation. Security-sensitive current Judge
and lifecycle lock SQL reads deliberately use the shared database to avoid an
authorization decision racing a remote status projection.

## External effects

- [DurableTasks](../../backend/common-lib/src/main/java/com/w16a/danish/common/recovery/DurableTasks.java): enqueue only in a transaction; service ownership, bounded polling, lease, retry, DEAD.
- [NotificationOutbox](../../backend/common-lib/src/main/java/com/w16a/danish/common/recovery/NotificationOutbox.java): persistent messages, event ID, mandatory route and publisher confirmation.
- [NotificationInbox](../../backend/user-service/src/main/java/com/w16a/danish/user/config/NotificationInbox.java): deduplication and email task in one transaction.
- [EmailDeliveryHandler](../../backend/user-service/src/main/java/com/w16a/danish/user/config/EmailDeliveryHandler.java): existing seven domain email renderers, persisted retry, SMTP ambiguity retained.
- [SubmissionFileCleanup](../../backend/registration-service/src/main/java/com/w16a/danish/registration/notify/SubmissionFileCleanup.java) and [UploadRollbackCleanup](../../backend/registration-service/src/main/java/com/w16a/danish/registration/notify/UploadRollbackCleanup.java): old-file tasks and rolled-back upload cleanup.
- [CompetitionMediaFiles](../../backend/competition-service/src/main/java/com/w16a/danish/competition/notify/CompetitionMediaFiles.java) and [AvatarFiles](../../backend/user-service/src/main/java/com/w16a/danish/user/profile/AvatarFiles.java): dedicated replacement transactions, known object references and cleanup tasks, without controller-level storage logic.
- [SubmissionScores](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/SubmissionScores.java): current revision/schema, complete criteria and real Judge assignment validation for score projections.
- [PublicSubmissionAccess](../../backend/interaction-service/src/main/java/com/w16a/danish/interaction/service/PublicSubmissionAccess.java): common public-approved guard before interaction reads and writes.
- Four domain notifiers and seven shared payloads remain. [Historical type IDs](../adr/0005-notification-wire-contracts.md) stay explicit compatibility identifiers.

## Tests and limits

This delivery reviewed source and contracts statically and did not execute the
tests, application, builds or deployment described below. Test source is retained
and synchronized with changed interfaces; its assertions are not current pass evidence.

Tests cover domain guard rejection, real H2/MyBatis/transaction rollback and row
serialization, task leases/restart/duplicate inbox, historical AMQP dispatch,
MinIO policy/caller contracts and streaming. [CI](../../.github/workflows/ci.yml)
retains all original coverage floors. The [integration script](../../scripts/integration-smoke.mjs)
uses real HTTP APIs and binary downloads; it does not mock transport.

Tests cannot certify public TLS, provider OAuth, SMTP delivery to a recipient,
existing storage policy or a restored production database. See [data](data.md),
[dependencies](dependencies.md) and the release runbook for those gates.
