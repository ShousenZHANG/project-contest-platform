<!-- Verified: 2026-10-04; source baseline: 8074df1 -->
# Project map

This is the navigation entry point for Questora. The 2026-10-04 scan inventories
597 tracked files at baseline `8074df1`: 252 backend main Java files, 48 backend
test Java files, and 180 frontend source files. The maps follow behavior through
controllers, services, schema, browser routes, auth/cache, Docker images, and CI.

## Maps

| Map | What it answers |
| --- | --- |
| [Architecture](architecture.md) | Topology, trust, HTTP contracts, complete business flow |
| [Backend](backend.md) | Controllers, service guards, Feign/gateway seams, notifications |
| [Frontend](frontend.md) | Route/role matrix, API services, session/cache, shared UI, tests |
| [Data](data.md) | Sixteen tables, shared persistence, indexes, MinIO, Redis, events |
| [Dependencies and deployment](dependencies.md) | Locked versions, build commands, Compose, CI/CD, deployment risks |
| [Scan evidence and findings](audit-2026-10-04.md) | Verification, reproduced failures, uncertainty, branch cleanup |

## Where to start for a change

| Task | Start here | Continue here |
| --- | --- | --- |
| Login/register/OAuth/logout | [user-service](../../backend/user-service/src/main/java/com/w16a/danish/user) | [auth](../../frontend/src/auth), [AuthContext](../../frontend/src/context/AuthContext.jsx), [gateway filters](../../backend/api-gateway/src/main/java/com/w16a/danish/gateway/filters) |
| Competition management | [competition-service](../../backend/competition-service/src/main/java/com/w16a/danish/competition) | [Organizer pages](../../frontend/src/Organizer) |
| Individual/Team registration | [registration services](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl) | [Participant pages](../../frontend/src/Participant), [registrationService.js](../../frontend/src/services/registrationService.js) |
| Team membership/ownership | [Team services](../../backend/user-service/src/main/java/com/w16a/danish/user/service/impl) | [Team UI](../../frontend/src/Participant/team), [teamService.js](../../frontend/src/services/teamService.js) |
| Submission/Organizer Review | [SubmissionRecordsServiceImpl](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl/SubmissionRecordsServiceImpl.java) | [review UI](../../frontend/src/Organizer/CheckSubmissions.jsx), [file-service](../../backend/file-service) |
| Judge Score/Winner selection | [judge-service](../../backend/judge-service/src/main/java/com/w16a/danish/judge) | [judgeService.js](../../frontend/src/services/judgeService.js), [frontend role caveats](frontend.md) |
| Vote/comment | [interaction-service](../../backend/interaction-service/src/main/java/com/w16a/danish/interaction) | [shared hooks](../../frontend/src/shared/hooks), [interactionService.js](../../frontend/src/services/interactionService.js) |
| Dashboard/reporting | [DashboardServiceImpl](../../backend/judge-service/src/main/java/com/w16a/danish/judge/service/impl/DashboardServiceImpl.java) | [registration analytics](../../backend/registration-service/src/main/java/com/w16a/danish/registration/service/impl), [judgeService.js](../../frontend/src/services/judgeService.js) |
| Response/error contract | [common-lib](../../backend/common-lib) | [queryFn.js](../../frontend/src/api/queryFn.js), [serviceUtils.js](../../frontend/src/services/serviceUtils.js) |
| Deployment failure | [Compose](../../docker-compose.yml), [Jenkinsfile](../../Jenkinsfile) | [deployment map](dependencies.md), [operations](../../README.md#operations) |

## Rules before editing

- [CONTEXT.md](../../CONTEXT.md): vocabulary; audit records implementation gaps.
- [AGENTS.md](../../AGENTS.md): conventions and generated-output policy.
- [ADR-0001](../adr/0001-frontend-design-system.md): design system and motion.
- [ADR-0002](../adr/0002-react-query-data-layer.md): React Query and query keys.
- [ADR-0003](../adr/0003-cross-service-gateway-seam.md): gateway seam.

Keep maps synchronized with routes, contracts, data boundaries, and operations.
State whether evidence is static, isolated runtime, browser, or live deployment.

## Current assessment

The platform has substantial workflows and automated tests, but the scan found
authorization/privacy defects outside those tests. Public Admin registration
and two unprotected controller writes were reproduced in isolation. Submission
file privacy, Score/Winner guards, cross-account cache state, and Judge navigation
need attention before a real competition. See the [audit](audit-2026-10-04.md).

## Branch policy

`master` is the sole retained local and origin branch. All eleven Dependabot
branch tips/history were archived before removal in a verified Git bundle, with
branch/PR metadata, under `.git/backups/2026-10-04-single-master/` in this checkout.
These updates were not merged merely to enable deletion.

Scheduled version-update PRs are paused in
[dependabot.yml](../../.github/dependabot.yml). Security settings are separate and
were not changed; see [GitHub's reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#open-pull-requests-limit).
Branch verification is a snapshot, not a server-side prohibition on a collaborator
or re-enabled automation creating future branches.
