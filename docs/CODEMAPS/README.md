<!-- Verified: 2026-10-04; scan baseline: 8074df1; architecture baseline: ca246ff -->
# Project map

This is the navigation entry point for Questora. The initial scan at `8074df1`
inventoried 597 tracked files, 252 backend main Java files, 48 backend test Java
files and 180 frontend source files. After the architecture pass based on
`ca246ff`, current source inventory is 245 backend main Java files, 51 backend
test Java files and 158 frontend source files (including the new session tests).
The maps follow controllers, services, schema, browser routes, auth/cache,
Docker images and CI; the dated scan keeps its original verification evidence.

## Maps

| Map | What it answers |
| --- | --- |
| [Architecture](architecture.md) | Topology, trust, HTTP contracts, complete business flow |
| [Backend](backend.md) | Controllers, service guards, Feign/gateway seams, notifications |
| [Frontend](frontend.md) | Route/role matrix, API services, session/cache, shared UI, tests |
| [Data](data.md) | Sixteen tables, shared persistence, indexes, MinIO, Redis, events |
| [Dependencies and deployment](dependencies.md) | Locked versions, build commands, Compose, CI/CD, deployment risks |
| [Scan evidence and findings](audit-2026-10-04.md) | Verification, reproduced failures, uncertainty, branch cleanup |
| [Architecture cleanup](../architecture-cleanup-2026-10-04.md) | Deleted code, deeper module boundaries, regression checks and remaining work |

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
- [ADR-0004](../adr/0004-session-lifetime-boundary.md): session cache/request lifetime.
- [ADR-0005](../adr/0005-notification-wire-contracts.md): shared notification wire compatibility.

Keep maps synchronized with routes, contracts, data boundaries, and operations.
State whether evidence is static, isolated runtime, browser, or live deployment.

## Current assessment

The platform has substantial workflows and automated tests, but the scan found
authorization/privacy defects outside those tests. Public Admin registration
and two unprotected controller writes were reproduced in isolation. Submission
file privacy, Score/Winner guards and Judge navigation still need attention before
a real competition. Cross-account cache/request isolation and persisted Submission
review/score reset were fixed in the [architecture pass](../architecture-cleanup-2026-10-04.md).
See the [audit](audit-2026-10-04.md) for unresolved authorization/privacy findings.

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
