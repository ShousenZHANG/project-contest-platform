# Architecture cleanup — 2026-10-04

The pass starts from `ca246ff` on the sole `master` branch, after the
[deep scan](CODEMAPS/audit-2026-10-04.md). It removes verified unused code and
concentrates repeated behavior behind existing module interfaces. Current
inventory is **245 production Java files, 51 Java test files and 158 frontend
source files**, compared with 252, 48 and 180 in the initial scan.

## Changes and their acceptance boundaries

| Area | Result | Evidence |
| --- | --- | --- |
| Unused frontend structure | Deleted 23 source files without a production entry, two obsolete mocks and five unused direct dependencies; removed obsolete tests tied only to deleted comment components. Current route pages and shared comment/profile behavior remain active. | Entry AST/import graph from main.jsx, repository caller searches, full Jest/build/browser checks; [deletion inventory](CODEMAPS/frontend.md#resolved-scan-findings-and-cleanup-evidence). |
| Session lifetime | AuthTokenManager owns a stable snapshot and generation. Each identity lifetime gets a separate QueryClient; old optimistic callbacks stay in the old client and delayed writes cannot start with the next account's token. API requests capture identity synchronously and reject stale responses. Logout starts server revocation before local clearing. | 13 new [lifecycle tests](../frontend/src/auth/__tests__/sessionLifecycle.test.jsx), plus existing auth/query tests. [ADR-0004](adr/0004-session-lifetime-boundary.md) records cache/remount trade-offs. |
| Notification contracts | Fourteen identical service-local DTOs become seven shared types. Real topology constants replace repeated literals and an unused/wrong common definition. One shared converter preserves legacy producer TypeIds and accepts both producer/consumer aliases. Removed a duplicate converter configuration. | 30 [converter contract cases](../backend/common-lib/src/test/java/com/w16a/danish/common/messaging/NotificationMessageConverterTest.java) and one [Boot listener wiring case](../backend/user-service/src/test/java/com/w16a/danish/user/config/NotificationListenerWiringTest.java). Four domain notifiers remain distinct; [ADR-0005](adr/0005-notification-wire-contracts.md) explains wire compatibility. |
| Submission replacement | Individual/team entry methods share a private metadata/reset/persistence implementation. Four Review/Score fields explicitly write NULL. Old object deletion follows successful SQL update, preserving the previous object when SQL rejects the replacement. | Six [H2/MyBatis persistence cases](../backend/registration-service/src/test/java/com/w16a/danish/registration/service/impl/SubmissionUploadPersistenceTest.java) call both public upload methods and reread rows through JDBC; existing guard cases remain. B15 is resolved. |
| Browser test infrastructure | Deleted an unsupported, unused Playwright reporterCallback; bounded workers to two. Accessibility scans wait for finite CSS animations and final content opacity rather than sampling mid-fade. | Final 35-test Chromium suite passes with retries disabled. Product motion and color tokens are unchanged. |

Removed frontend packages: `@lottiefiles/react-lottie-player`,
`@radix-ui/react-scroll-area`, `dayjs`, `@testing-library/user-event` and
`vite-tsconfig-paths`. Runtime-unreachable TypeScript declarations remain because
their types are imported. Backend Spring-discovered configuration and MyBatis
mappers remain; lack of a direct Java caller is not proof of dead code.

The backend production file count falls by seven: fourteen old DTOs and one
duplicate config are deleted; seven shared DTOs and one converter are added.
Submission persistence reuses its existing service interface and concentrates
the repeated write block in one private implementation. A broad split of the
large orchestration services remains open under ADR-0003; no generic facade or
publisher was added merely to hide their complexity.

## Verification

| Check | Result |
| --- | --- |
| `.\mvnw.cmd -B --no-transfer-progress clean verify` | PASS: 10 reactor projects; 605 tests in 67 Surefire suites; zero failures, errors or skips; 4m44s. Clean compilation prevents deleted Java classes from surviving in target/. |
| JaCoCo | Eight per-module coverage gates passed. Aggregate line coverage 2,910 / 3,824 = **76.10%**; branch coverage 656 / 1,139 = **57.59%**. DTOs and other configured exclusions are outside these counters. |
| `npm test -- --runInBand --silent` | PASS: 36 suites, 186 tests. Initial 178 minus five obsolete implementation cases plus thirteen lifecycle cases. |
| `npm run build` | PASS: production Vite build. |
| `tsc --noEmit` | PASS; checkJs remains false, so this is not full JavaScript type validation. |
| `npm run test:e2e -- --retries=0` | PASS: 35 Chromium tests, two workers, no retries, 1.1 minutes. |
| Independent code review | No blocking regression found; checked actual Axios/TanStack execution semantics, OAuth/mount behavior and old/new message wire contracts. |
| Documentation and diff checks | Current maps, two ADRs and README synchronized; local links and diff whitespace checked before commit. |

The first architecture browser run had 34 passed and one dialog contrast check
that passed only on retry. Its failure sampled a Radix CSS entrance animation.
Waiting for finite CSS animations addresses the same readiness class as the
homepage opacity issue; the final complete run used zero retries.

Local raw evidence is under `.git/audit/2026-10-04/`: architecture-maven-verify.log,
architecture-metrics.json, architecture-messaging-tests.log, architecture-e2e.log
and architecture-e2e-final.log. Build, test-results, coverage and Playwright
reports remain ignored. The interactive before/after review was generated and
visually checked in the machine's temporary directory, as required by the invoked
architecture skill; this document retains its implementation and acceptance facts.

## Remaining work from the scan

Authorization/privacy findings B01–B14 remain open: public Admin registration,
unguarded internal score/status writes, file ownership/privacy, Score/Winner
validation and notification/remote-write recovery are among them. See the
[backend findings](CODEMAPS/backend.md) for exact triggers and evidence.
Judge navigation, synthetic homepage IDs, OAuth URL origins, pagination and other
frontend gaps remain in the [frontend map](CODEMAPS/frontend.md).

Replacement still crosses upload, SQL, file deletion and MQ without a shared
transaction. A failure after SQL update but before commit can still leave an old
object deleted; failed writes can leave the new upload orphaned. Existing Judge
detail rows are not cleared on replacement. The new local H2 tests use autocommit
and mocks and prove SQL null-update behavior, not production MySQL constraints,
Spring transaction rollback or live MinIO/RabbitMQ consistency. Docker engine
availability and real gateway/DB/OAuth/mail/object-store journeys were not
verified in this pass.

`master` remains the only retained branch. No dependency versions were upgraded,
and the previous branch-recovery bundles remain in this checkout's .git/backups/.
