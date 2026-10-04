<!-- Audited: 2026-10-04 | Inventory: 10 Maven POMs, 9 Dockerfiles, 7 runtime and 7 test configurations, npm manifest/lockfile, Compose, GitHub Actions, Jenkins, Dependabot -->
# Dependencies, Configuration, and Deployment Map

This map records versions and wiring from the checked-out manifests and lockfile. It does not claim these are the latest available releases or that a deployment is running. See [data.md](data.md) for storage/event consistency and [architecture.md](architecture.md) for routing.

## Compose runtime

[docker-compose.yml](../../docker-compose.yml) defines **14 default services**: 6 infrastructure processes, 7 backends, and 1 frontend. Jenkins is a fifteenth service behind the optional `ci` profile.

| Process | Image / build | Host ports | Persistence / function |
| --- | --- | --- | --- |
| MySQL | `mysql:8.0.42` | 3306 | `mysql-data`; shared DB, bootstrap `mysql-init` |
| Redis | `redis:7.4.3` | 6379 | `redis-data`; token state; no password/AOF command configured |
| RabbitMQ | `rabbitmq:4.0.7-management` | 5672, 15672 | `rabbitmq-data`; 3 topic exchanges / 7 queues |
| Nacos | `nacos/nacos-server:v2.5.1` | 8848 | `nacos-data`; standalone discovery; Australia/Sydney TZ |
| MinIO | `minio/minio:RELEASE.2025-04-22T22-12-26Z` | 9000, 9001 | `minio-data`; avatars/promos/submissions |
| Zipkin | `openzipkin/zipkin:3` | 9411 | No persistent volume; tracing receiver |
| api-gateway | Root context; [Dockerfile](../../backend/api-gateway/Dockerfile) | 8080 | Auth/routing; Redis |
| user-service | Root context; [Dockerfile](../../backend/user-service/Dockerfile) | None; container 8081 | Identity/teams; Redis, MQ listener, SMTP/OAuth |
| competition-service | Root context; [Dockerfile](../../backend/competition-service/Dockerfile) | None; container 8082 | Competition writes; MQ producer |
| file-service | Root context; [Dockerfile](../../backend/file-service/Dockerfile) | None; container 8083 | MinIO client |
| registration-service | Root context; [Dockerfile](../../backend/registration-service/Dockerfile) | None; container 8084 | Registration/submission writes; MQ producer |
| interaction-service | Root context; [Dockerfile](../../backend/interaction-service/Dockerfile) | None; container 8085 | SQL votes/comments |
| judge-service | Root context; [Dockerfile](../../backend/judge-service/Dockerfile) | None; container 8086 | SQL scores/winners; MQ producer |
| frontend-web | Frontend context; [Dockerfile](../../frontend/Dockerfile) | 3000 | `build/` served by npm `serve` |
| Jenkins (`ci`) | `jenkins/jenkins:jdk21` + [Dockerfile.jenkins](../../Dockerfile.jenkins) | 8888, 50000 | `jenkins_home`; privileged/root; Docker socket |

All containers share `my-network`. Seven backend services depend on **all five** core infrastructure services being healthy, and their entrypoints chain TCP waits for those five, even when a given application does not use each dependency. MinIO failure can therefore block interaction-service startup. Zipkin is not a required startup dependency.

Backend images use `maven:3.9.9-eclipse-temurin-23-alpine` builders and `eclipse-temurin:23-jre-alpine-3.21` runtimes. Builders package one module and its prerequisites with `-DskipTests`; CI/Jenkins provide separate test gates. Application runtime users are non-root (`app`). Each backend has 768 MiB / 1 CPU limits and `MaxRAMPercentage=75.0`; frontend has 256 MiB / 1 CPU. Infrastructure resources are uncapped. Stateful data uses [named volumes:402](../../docker-compose.yml#L402).

Core infrastructure, Zipkin, and backends have healthchecks. Frontend/Jenkins do not. Backend probes use `/actuator/health`; frontend uses startup ordering without `service_healthy` conditions. A healthcheck declaration does not establish deployment health.

## Backend dependency contract

[pom.xml](../../pom.xml) parents nine modules: common-lib, gateway, six domain/storage services, and coverage-report. Coordinates are `w16a.danish:project-contest:0.0.1-SNAPSHOT`; Java packages mostly use `com.w16a.danish`. The [wrapper](../../.mvn/wrapper/maven-wrapper.properties) selects Maven 3.9.9; compiler source/target is Java 23.

| Dependency / tool | Declared version | Source / role |
| --- | --- | --- |
| Spring Boot parent/plugin | 3.4.3 | [root POM:6](../../pom.xml#L6) |
| Spring Cloud BOM | 2024.0.1 | [root properties:46](../../pom.xml#L46) |
| Spring Cloud Alibaba BOM | 2023.0.3.2 | Nacos discovery |
| MyBatis-Plus starter/parser | 3.5.17 | Shared property; common/data modules |
| OpenFeign starter | 4.2.1 | Explicit override; commons-fileupload excluded |
| Feign form | 3.8.0 | Multipart encoding |
| Hutool BOM/all | 5.8.36 | JWT/utilities |
| MySQL Connector/J | 9.2.0 | Five data-service POMs |
| MinIO Java client | 9.0.3 | [file POM:38](../../backend/file-service/pom.xml#L38) |
| SpringDoc | 2.8.5 | Boot 3 line; compatibility comment in parent |
| Knife4j | 4.5.0 | Web/gateway documentation |
| Lombok | 1.18.36 | Processor/provided dependency |
| Mockito / AssertJ / WireMock | 5.17.0 / 3.27.3 / 3.13.0 | Tests |
| JaCoCo / compiler plugin | 0.8.13 / 3.15.0 | Verify gates / Java 23 |
| H2, Actuator, tracing, Prometheus, Redis, AMQP, Mail, validation | Boot/BOM-managed unless overridden | Consult effective POM for transitive versions |

The parent adds Redis, Mail, AMQP, discovery, validation, OpenFeign, and observability across modules. Dependency inheritance does not imply actual usage. Gateway disables AMQP; competition/registration/judge disable Redis; interaction disables Redis/AMQP; file disables JDBC/Redis/AMQP. `common-lib` brings MVC/MyBatis dependencies, requiring explicit gateway/file exclusions.

## Frontend dependency contract

[package.json](../../frontend/package.json) declares ranges; **[package-lock.json](../../frontend/package-lock.json) is tracked** and records resolved versions. The old map's statement that it is ignored is obsolete. CI uses `npm ci`.

| Package | Manifest range | Locked version |
| --- | --- | --- |
| React / React DOM | `^19.2.8` | 19.2.8 |
| Vite / React plugin | `^8.1.5` / `^6.0.4` | 8.1.5 / 6.0.4 |
| Tailwind / Vite integration | `^4.0.10` / `^4.3.3` | 4.3.3 / 4.3.3 |
| TanStack Query | `^5.100.8` | 5.100.8 |
| Axios | `^1.8.4` | 1.14.0 |
| React Router DOM | `^6.22.3` | 6.30.3 |
| Framer Motion | `^12.6.3` | 12.38.0 |
| Recharts | `^2.15.3` | 2.15.4 |
| lucide-react / Zod | `^1.27.0` / `^4.4.2` | 1.27.0 / 4.4.2 |
| Jest / jsdom environment | `^29.7.0` | 29.7.0 |
| Playwright test | `^1.62.1` | 1.62.1 |

Other dependencies cover Radix primitives, React Hook Form, Sonner, next-themes, class utilities, Day.js, fonts, and Lottie. Vite/plugin lock entries require Node **`^20.19.0 || >=22.12.0`** ([Vite:9509](../../frontend/package-lock.json#L9509), [plugin:4326](../../frontend/package-lock.json#L4326)); “Node 20+” is an imprecise prerequisite.

[Vite:25](../../frontend/vite.config.js#L25) outputs `build/`; dev server port is 3000. [apiClient:12](../../frontend/src/api/apiClient.js#L12) uses build-time `VITE_API_BASE_URL`, defaulting to `http://localhost:8080`. Dockerfile has no corresponding ARG/ENV and Compose supplies no frontend build arguments. Runtime container environment changes do not rewrite a built Vite bundle.

## Configuration and integrations

`.env.example` is the public development template; real `.env` contents were not inspected. Compose forwards backend settings explicitly; a variable merely present in root `.env` is not automatically injected into applications.

| Setting | Consumers | Wiring / limitation |
| --- | --- | --- |
| `JWT_SECRET` | gateway/user | No fallback; Compose substitutes blank when missing instead of rejecting configuration |
| `MYSQL_ROOT_PASSWORD` | MySQL | Default development credential; initialization-time setting |
| `MYSQL_USER/PASSWORD` | Five data services | Default root credentials; MySQL Compose does not provision custom accounts from these variables |
| `RABBITMQ_USER/PASSWORD` | Broker/producers/user consumer | Defaults supplied; gateway receives them despite disabled AMQP |
| `MINIO_ROOT_USER/PASSWORD` | MinIO/file-service | Defaults supplied; client uses root account |
| `CORS_ALLOWED_ORIGINS` | gateway | Comma-separated; default localhost:3000 |
| `OAUTH_REDIRECT_BASE_URL` | user-service | Provider callback base; default gateway localhost |
| Google/GitHub client ID/secret | user-service | Optional OAuth credentials |
| `MAIL_USERNAME/PASSWORD` | user-service | Gmail SMTP:587, STARTTLS; optional-mail health disabled |
| `frontend.base-url` | User email/OAuth redirect builders | Hardcoded localhost:3000; no Compose override |
| `minio.public-endpoint` | Returned/stored object URLs | Hardcoded localhost:9000; no Compose override |
| `VITE_API_BASE_URL` | Browser bundle | Build-time; not wired in Compose/Dockerfile |

OAuth uses provider code/token/user-info calls and one-use servlet-session state. No shared Redis-backed HTTP session is configured, so user-service scaling needs explicit affinity/session design. SMTP handles notifications/password reset. No external OAuth/mail call was exercised during this audit.

All backends expose health/info/metrics/prometheus and sample traces at 1.0 to `http://zipkin:9411/api/v2/spans`. Compose includes neither a Prometheus scraper nor persistent Zipkin storage.

## CI, dependency updates, and delivery

| Mechanism | Actual configuration | Scope / limitation |
| --- | --- | --- |
| [GitHub Actions](../../.github/workflows/ci.yml) | Push/PR to `master`; Java 23 Maven verify; Node 20 npm ci/Jest/build/Chromium/Playwright | Two jobs, no infrastructure containers. Backend uses mocks/H2/WireMock; Playwright stubs API calls. |
| [Jenkinsfile](../../Jenkinsfile) | Maven verify; npm ci/Jest/build; optional Trivy; write env; Compose pull/build/down/up/ps | No Playwright; security scan cannot fail build; no health wait/assertion or API smoke test. |
| [Dependabot](../../.github/dependabot.yml) | Maven/npm/actions configurations retain weekly schedules/groups, with all three `open-pull-requests-limit: 0` | Version-update PR creation paused to support the single-main-branch policy. |
| Maven coverage | Per-module JaCoCo verify floors and aggregate artifact | Anti-regression gates, not live-stack coverage |

GitHub documents that a zero [open-pull-requests-limit](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#open-pull-requests-limit) pauses version updates; security-update PRs are not subject to this limit. Repository security-update settings were not changed during branch consolidation. The root audit read the GitHub automated-security-fixes setting as `enabled=false`, `paused=false` on 2026-10-04; this is a point-in-time account/repository setting, not an effect of this YAML change.

Actions use mutable major tags (`checkout@v7`, `setup-java@v5`, `setup-node@v7`, `upload-artifact@v7`), not commit SHAs. Jest CI masks open handles with `--forceExit`, explicitly tracked in its comment. No lint/typecheck script, real-infrastructure integration job, deployment rollback, or backup/restore stage is configured.

[Jenkinsfile:45](../../Jenkinsfile#L45) writes only JWT/mail/OAuth credentials to `.env`, overwriting an existing workspace file. Infrastructure credentials/CORS/base URLs fall back to development defaults unless independently supplied to Jenkins. [Dockerfile.jenkins](../../Dockerfile.jenkins) uses JDK 21 and installs Docker CLI/Compose, not Java 23/Node 20. `agent any` requires a prepared agent for backend/frontend stages.

## Deployment risks and current validation

These are source-backed risks, not evidence of an exposed production deployment:

| Risk | Evidence / impact |
| --- | --- |
| Infrastructure exposure | [Compose:7](../../docker-compose.yml#L7), [22](../../docker-compose.yml#L22), [37](../../docker-compose.yml#L37), [57](../../docker-compose.yml#L57), [77](../../docker-compose.yml#L77) publish infrastructure ports. Redis has no configured authentication; data services share root credentials by default. Domain-service host ports are hidden. |
| Secrets in build context | Root [.dockerignore](../../.dockerignore) omits `.env`/`.env.*`; backend builders `COPY . .`. Real secrets can enter daemon context/builder layers, though declared final-image COPY takes only JAR/script. |
| Reproducibility | [Frontend Dockerfile:4](../../frontend/Dockerfile#L4) uses mutable Node tags, npm install/fallback rather than npm ci, and unversioned global serve. Images are tagged rather than digest-pinned. No frontend `.dockerignore` exists. |
| Jenkins host control | [Compose:369](../../docker-compose.yml#L369) grants root/privileged mode and Docker socket access; optional `ci` profile excludes it from default startup. |
| Non-local URLs | Browser API, user redirects/emails, and stored object URLs default independently to localhost. Copying the env template does not produce correct public URLs. |
| Upgrade/recovery | Persistent volumes need schema migrations; Jenkins down/up causes downtime without rollback. No recovery exercise is recorded. |
| Deployment gate | [Jenkinsfile:76](../../Jenkinsfile#L76) only prints Compose status; success is not proof of healthy services/business flows. |

Read-only checks on **2026-10-04**:

| Check | Result | Meaning |
| --- | --- | --- |
| `docker compose config --quiet` | Exit 0; unset JWT/OAuth/mail warnings | Syntax parses; operational credentials are absent in this execution environment. |
| `docker ps --format ...` | Exit 1; Docker Desktop Linux engine pipe unavailable | No live container status/health collected; no stack was started. |
| `git ls-files frontend/package-lock.json` | Lockfile present | Canonical frontend lock is tracked. |
| POM/lock/config inspection | Completed | Declared/resolved versions and wiring; not compatibility/security/deployment proof. |

Test/build results from the overall scan are in [README.md](README.md). Live acceptance still needs MySQL schema/cascade checks, object-access checks, broker/SMTP verification, gateway API flows, and demonstrated DB/object recovery.
