# Dependencies and deployment map

Updated 2026-10-04. Manifests and lockfiles below define the actual checked-out
versions; this map is not a generic “latest dependency” claim.

## Runtime and build

| Layer | Current contract | Source |
| --- | --- | --- |
| JVM | Java 25; Maven wrapper 3.9.9 | [root POM](../../pom.xml), [.mvn](../../.mvn/wrapper/maven-wrapper.properties) |
| Spring | Boot 4.1.1, Cloud 2025.1.2, Alibaba 2025.1.0.0 | Root BOMs; server Nacos 3.1.1 matches the current client generation |
| Persistence | MyBatis-Plus Boot4 starter 3.5.17; MySQL driver follows Boot BOM | Module POMs |
| JSON / queue | Jackson2 bridge plus historical AMQP converter IDs | Boot compatibility module, ADR-0005/0007; bounded bridge before Boot4.3 |
| API docs | Springdoc 3.1.1, explicit gateway aggregation | Gateway/domain configurations; `/doc.html` retained |
| Schema | Flyway 13.9.0, filesystem V1/V2/V3 | [database](../../database), Compose one-shot migration |
| Browser build | Node 24 LTS, npm ci, React19/Vite8/Tailwind4 | [package.json](../../frontend/package.json), [lockfile](../../frontend/package-lock.json), [Dockerfile](../../frontend/Dockerfile) |
| Tests | BOM-managed JVM testing, JaCoCo0.8.14, Jest29, Playwright | POMs, package/CI configs; existing coverage floors preserved |

Seven production backend Dockerfiles build their module and prerequisites with
Java25, then run as a non-root user. [Dockerfile.runtime](../../backend/Dockerfile.runtime)
and its specific ignore file reuse verified reactor JARs for integration. Source
and frontend Docker ignores exclude environment files and generated dependency/report
directories; build-time browser API origin is an explicit non-secret build argument.

## Infrastructure and startup

[Compose](../../docker-compose.yml) defines MySQL, Redis, RabbitMQ, Nacos, object
storage, Zipkin, seven backends, frontend and one-shot migration/Nacos bootstrap.
Jenkins remains optional. Data/management ports bind loopback; the edge gateway and
frontend are the application entry points. Named volumes survive ordinary down.

MySQL health precedes Flyway; secure Nacos health precedes its account/permission
bootstrap. Backends require successful one-shot dependencies. SMTP is an external
integration in normal Compose; the isolated
[integration override](../../docker-compose.integration.yml) captures mail in Mailpit.

Nacos3 uses console8080 (host8849), server8848 and gRPC9848. Admin/console/client
auth are explicitly enabled; [bootstrap](../../infra/nacos/bootstrap.py) creates a
separate discovery account without silently resetting an existing administrator.

The old official MinIO image is no longer a dependable pull target. Local integration
uses a reproducible build from the locked official source revision where necessary.
Archived community MinIO is not the recommended maintained public-storage dependency;
production requires a supported S3 provider/AIStor and actual policy verification.

## Configuration surfaces

| Setting | Consumer / semantics |
| --- | --- |
| JWT_SECRET | User JWT signing/verification |
| SERVICE_JWT_SECRET | Independent internal credential; required, long and different |
| MYSQL_* | Container/database connections; custom DB users must actually be provisioned |
| RABBITMQ_* | Broker and producers/consumer |
| NACOS_AUTH_TOKEN/IDENTITY_* | Server auth; not forwarded as service administrator credentials |
| NACOS_ADMIN_PASSWORD | Explicit bootstrap only |
| NACOS_USERNAME/PASSWORD | Limited discovery client account |
| MINIO_* | Object endpoint/credentials/public media origin; application Submission downloads remain private |
| VITE_API_BASE_URL | Browser build-time API origin; image rebuild needed after change |
| FRONTEND_BASE_URL/OAUTH_REDIRECT_BASE_URL | Email and OAuth callback/application origins |
| CORS_ALLOWED_ORIGINS | Allowed browser origins |
| MAIL_* / provider client credentials | Optional real SMTP/OAuth; integration uses a local mail capture service |

`.env.example` lists development defaults. Real `.env` was not inspected. Copying
variables into the shell does not automatically wire a container; Compose explicitly
forwards these settings. Public deployment needs TLS, credential management, backup
and the [release gates](../production-readiness-2026-10-04.md).

## Pipelines and evidence

The current delivery used static parsing, interface/configuration review and
TypeScript checking only. The commands and pipelines below describe future
verification; they were not run during this delivery.

[Actions](../../.github/workflows/ci.yml) uses JDK25/Node24 and verify/Jest/tsc/build/
zero-retry Playwright. The isolated [runtime runner](../../infra/integration/run.py)
uses only its generated `.git` environment, its `runtime-tests` project and separate
volumes; it does not delete data or load the checkout `.env`. The
[HTTP smoke](../../scripts/integration-smoke.mjs) uses real requests and binary checks.

[Jenkinsfile](../../Jenkinsfile) requires a Java25/Node24/Docker agent, checks tools,
and uses a complete Secret File environment validated without printing secrets.
Deployment is explicit and uses health wait; it no longer overwrites `.env` or
tears down the stack before an update. An actual configured Jenkins agent/deploy
is a separate verification item. Its controller JVM is not the project build JVM.

Scheduled [Dependabot version PRs](../../.github/dependabot.yml) remain paused to
support the sole-master policy; security-update settings are separate. Action major
tags are still mutable, and Jest's CI forceExit masks pre-existing open handles.
Observability exporters alone do not provide deployed alerting, retention or SLOs.
