# ADR-0005: Shared notification types retain their historical wire IDs

**Date:** 2026-10-04 · **Status:** Accepted

The seven notification payloads were declared twice, once in the producing service
and once in user-service. They now have one definition in common-lib, alongside
the actual exchange, queue and routing-key constants. Registration, Submission,
Competition and Award keep their separate domain notifiers; common-lib shares
the wire contract rather than a generic publication workflow.

Changing a Java package ordinarily changes Jackson AMQP's `__TypeId__` header.
The shared converter deliberately emits the original producer class name and
accepts both original producer and user-service class names. This permits queued
historical messages and older consumers during a rolling deployment. The explicit
outbound choice avoids an ambiguous reverse lookup when two aliases name one class.
JSON fields, date representation and RabbitMQ topology names remain unchanged.

The legacy names in the converter are compatibility identifiers, not references
to classes that should be restored. Contract tests check all seven payloads in
both directions; a Boot listener wiring test checks that the user-service has one
converter and dispatches a decoded message. They do not establish broker delivery,
SMTP delivery or durable recovery from publication failures.
