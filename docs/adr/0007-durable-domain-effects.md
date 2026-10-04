# ADR-0007: Persist domain effects in the local transaction

**Date:** 2026-10-04 · **Status:** Accepted

Earlier notifiers swallowed RabbitMQ failures, old files could disappear before
database success, and score projection depended on an immediately available remote
write. The current service and shared-schema boundaries support a smaller recovery
mechanism than introducing a distributed workflow platform.

A domain transaction inserts external work into `durable_tasks` with its local
change. A service-owned worker claims a lease, applies bounded exponential retries,
and retains exhausted work as DEAD. The current lease is 120 seconds, maximum eight
attempts and poll batch twenty. Only the current lease owner may complete a task.

Notifications use persistent messages, stable event IDs, mandatory routing and
correlated Rabbit publisher confirmation. user-service records the inbox ID and
email task in one transaction before acknowledging reception. Historical wire IDs
from ADR-0005 remain supported; messages without event IDs use a deterministic hash.
Inbox deduplication does not make SMTP exactly once: accepted mail can be retried
after an ambiguous connection or process failure.

Score projection carries a monotonically increasing score version and Submission
revision; conditional writes ignore stale, duplicate, unapproved or wrong-revision
tasks. Status projection is idempotent, while the committed award row blocks writes
immediately. Submission files, Competition media and avatars queue old-object
deletion with local success; the previous object remains until database commit.
A rolled-back
upload records cleanup in a new transaction; an outage preventing that insert still
requires object reconciliation. A crash after external upload and before registering
compensation has the same reconciliation requirement; it is not an exactly-once
object transaction. Media/avatar business updates cannot inject storage references.

Flyway V1 creates the prior schema without a default Admin. V2 adds tasks, inbox,
award locks, score versions/revisions and Winner snapshots. V3 adds stable provider
subject bindings without automatically linking historical accounts by email.
Existing volumes require
a schema audit, backup and explicit baseline; automatic baseline and clean are
disabled. Data services start after migration. Restoration rehearsal is separate
release evidence, not implied by H2 tests or a successful build.

Java 25 and Boot 4.1 use matching Cloud and Alibaba lines. Jackson 2 compatibility
is an explicit bridge preserving HTTP fields and queued payloads; Boot schedules
its removal in 4.3. Jackson 3 migration is a future bounded contract change.
See the [release runbook](../production-readiness-2026-10-04.md).
