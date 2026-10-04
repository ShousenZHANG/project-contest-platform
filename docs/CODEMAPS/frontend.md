<!-- Verified scan and architecture cleanup: 2026-10-04 -->
# Frontend code map

This map describes the checked-out implementation after the architecture cleanup, including incomplete paths. The initial scan's failures remain below as historical evidence, separately from current changes and checks. Read [CONTEXT.md](../../CONTEXT.md) for vocabulary, [ADR-0001](../adr/0001-frontend-design-system.md) for UI decisions, and [ADR-0002](../adr/0002-react-query-data-layer.md) for data decisions. Historical phase checkmarks are not proof that a role journey works today.

## Inventory and entry points

| Item | Verified count / implementation |
|---|---|
| Files below `frontend/src` | 158: 94 JSX, 36 JS, 19 TSX, 6 TS, 1 CSS, 2 JPG. Initial 180 minus 23 deleted files gives 157; the new session lifecycle test brings the final inventory to 158. |
| Production JS/JSX/TS/TSX files | 117, excluding Jest files; previously 138 |
| Routes / lazy imports | 39 explicit paths including `*` / 39 lazy imports |
| Domain HTTP service files | 6, plus `serviceUtils.js`; the unused `index.js` barrel was deleted |
| Service HTTP calls | 85; every literal call matches a backend verb and path shape |
| React Query production source files | 38 containing `useQuery`, `useQueries` or `useMutation`, including `useQueryClient` |
| Shared / UI primitive files | 12 / 14 |
| Jest / Playwright files | 36 / 7 |

Versions and commands live in [package.json](../../frontend/package.json) and [package-lock.json](../../frontend/package-lock.json). The stack is React 19, Vite, React Router 6, Tailwind 4, Radix, Axios, TanStack Query, Sonner, Framer Motion and Recharts. The shell/primitives and two service modules use TypeScript; most business UI is JavaScript. MUI, TanStack Table and react-day-picker are not dependencies in this checkout.

```mermaid
flowchart TD
    Main[main.jsx: StrictMode] --> Theme[ThemeProvider: next-themes]
    Theme --> Query[QueryProvider: QueryClient per session generation]
    Query --> Motion[MotionConfig: reducedMotion=user]
    Motion --> App[App: ErrorBoundary + AuthProvider + BrowserRouter]
    App --> Public[PublicLayout + PageTransition + Outlet]
    App --> Guard[ProtectedRoute: authentication / optional role]
    Guard --> Shell[AuthenticatedShell: AppShell + Sidebar + Topbar]
    Shell --> Pages[Lazy route pages]
    Public --> Pages
    Pages --> Hooks[React Query and shared hooks]
    Hooks --> Unwrap[queryFn.unwrap + serviceUtils]
    Unwrap --> Services[services: domain contracts]
    Services --> Axios[apiClient: captured session, 15s timeout, stale response rejection]
    Axios --> Gateway[API gateway :8080]
    App --> Session[authTokenManager: stable snapshot + session generation + events]
    Session --> Axios
    Session --> Query
```

- [main.jsx](../../frontend/src/main.jsx): providers, local font imports, global motion policy and Toaster.
- [App.jsx](../../frontend/src/App.jsx): actual router and authorization groups; Suspense uses a named progressbar.
- [vite.config.js](../../frontend/vite.config.js): port 3000, `@` alias, `/api` development proxy, `build/` output and vendor chunk.
- [index.html](../../frontend/index.html): real Vite entry, viewport and metadata; `public/index.html` is not the Vite entry.

## Actual route map

`App.jsx` owns the router and authorization groups. The unused `routeManifest.js` mirror and `useRoute.js` adapter were deleted during cleanup; there is no second route catalogue to maintain. Sidebar navigation remains in `Sidebar.tsx`.

| Access group | Paths | Ownership |
|---|---|---|
| Public (12 including fallback) | `/`, `/login`, `/reset-password`, `/oauth/callback`, `/how-to-use`, `/contest-list`, `/publiccontest-detail/:id`, `/work-list`, `/publicusercoments/:submissionId`, `/public-teams/:contestId`, `/public-team-detail/:competitionId/:teamId`, `*` | `Homepages/`, `PublicUser/`, `pages/` |
| Participant only (5) | `/profile/:email`, `/contest/:email`, `/teams/:email`, `/project/:email`, `/rating/:email` | `Participant/profile`, `contest`, `team`, `project`, `Rating.jsx` |
| Any authenticated account (8) | `/contest-detail/:id`, `/JudgeSubmissions/:competitionId`, `/RatingDetail/:competitionId/:submissionId`, `/ReRating/:competitionId/:submissionId`, `/view-submission/:competitionId`, `/comments/:submissionId`, `/team-project-detail/:competitionId/team/:teamId`, `/project-detail/:competitionId` | `Participant/` |
| Organizer only (10) | `/OrganizerProfile/:email`, `/OrganizerDashboard/:email`, `/OrganizerContestList/:email`, `/OrganizerContest/:email`, `/OrganizerEditContest/:email`, `/OrganizerUploadMedia/:id`, `/OrganizerParticipantList/:competitionId`, `/OrganizerSubmissions/:competitionId`, `/submissions/:competitionId/ratings`, `/OrganizerAddJudge/:competitionId` | `Organizer/` |
| Admin only (4) | `/AdminProfile`, `/AdminAccountManage`, `/AllCompetitions`, `/AdminDashboard` | `Admin/` |

The `:email` segments are navigation context, not authentication. Identity comes from session/API headers. The organizer edit route retains its historical email parameter while competition identity comes from the `?competitionId=` query parameter (`EditContest.jsx:72-74`, `ContestList.jsx:126-127`).

[ProtectedRoute](../../frontend/src/components/ProtectedRoute.jsx) sends missing sessions to `/login` with return-location state and role failures to `/`; role checks are case-insensitive. [AuthenticatedShell](../../frontend/src/layouts/AuthenticatedShell.jsx) reads AuthContext, not the URL.

[Sidebar.tsx](../../frontend/src/layouts/Sidebar.tsx) provides Home and Browse Contests for every role, then adds Participant Profile/Competitions/Teams/Submissions/Scoring Queue, Organizer Profile/Dashboard/Competitions/Create, or Admin Dashboard/Accounts/Competitions/Profile. There is no Judge role branch. Desktop navigation collapses; mobile navigation uses a Radix Sheet. [Topbar.tsx](../../frontend/src/layouts/Topbar.tsx) has theme/account controls, an optional search callback that AppShell does not supply, and a notification button with no action.

## Feature ownership and API seams

| Journey | Main source | Service / backend ownership |
|---|---|---|
| Sign in, register, reset, OAuth callback | `Homepages/Login.jsx`, `RegisterModal.jsx`, `RoleSelectModal.jsx`, `pages/ResetPassword.jsx`, `OAuthCallback.jsx` | `userService.ts` / `UsersController` |
| Public competition catalogue/detail | `PublicUser/UserContestList.jsx`, `PublicContestDetail.jsx`, `UserContestCard.jsx`, public list/table components | `competitionService.ts` / `CompetitionsController` |
| Approved works, votes and comments | `PublicUser/WorkList.jsx`, `ComentsPage.jsx`; `Participant/contest/ViewSubmission.jsx`, `CommentsPage.jsx`; `Participant/ViewVote.jsx` | submission, vote and comment services / registration-service + interaction-service |
| Participant registration/withdrawal | `Participant/contest/ContestCard.jsx`, `ChangeContestList.jsx`, `ContestDetail.jsx` | `registrationService` / `CompetitionParticipantsController` |
| Individual submission lifecycle | `Participant/project/Project.jsx`, `Projectdetail.jsx`, `Submitbottom.jsx` | `submissionService` / `SubmissionRecordsController` |
| Teams, membership, team submission | `Participant/team/TeamPage.jsx`, `ParticipantTeam.jsx`, dialogs, `TeamRegistrations.jsx`, `TeamProjectDetail.jsx`; public team pages | team, registration and submission services / user-service + registration-service |
| Organizer competition lifecycle/media | `Organizer/Contest.jsx`, `ContestList.jsx`, `EditContest.jsx`, `UploadMedia.jsx` | competition-service; file-service uploads through backend delegation |
| Organizer removal/admissibility review | `Organizer/ParticipantList.jsx`, `CheckSubmissions.jsx` | registration/submission services |
| Judge assignment/removal | `Organizer/OrganizerAddJudge.jsx` | competition service assignment/list/removal; assignment uses emails |
| Judge score/revision | `Participant/Rating.jsx`, `JudgeSubmissions.jsx`, `RatingDetail.jsx`, `ReRating.jsx` | `judgeService` / `SubmissionJudgesController` |
| Score comparison/auto-award | `Organizer/SubmissionRatings.jsx` | `winnerService` / `SubmissionWinnersController` |
| Organizer/platform dashboards | `Organizer/Dashboard.jsx`, `Admin/AdminDashboard.jsx` | `dashboardService` / `DashboardController` |
| Admin accounts/competitions | `Admin/AdminAccountManage.jsx`, `AdminCompetitionsManage.jsx` | user/competition services |

### Endpoint modules

| Source | Literal HTTP calls | Controller routes |
|---|---:|---|
| [userService.ts](../../frontend/src/services/userService.ts) | 13, plus two OAuth URL builders | `/users` |
| [teamService.js](../../frontend/src/services/teamService.js) | 15 | `/teams` |
| [competitionService.ts](../../frontend/src/services/competitionService.ts) | 16 | `/competitions` |
| [registrationService.js](../../frontend/src/services/registrationService.js) | 22 across registration/submission exports | `/registrations`, `/submissions` |
| [interactionService.js](../../frontend/src/services/interactionService.js) | 8 across comments/votes | `/interactions` |
| [judgeService.js](../../frontend/src/services/judgeService.js) | 11 across judging/winners/dashboards | `/judges`, `/winners`, `/dashboard` |

[serviceRoutes.test.js](../../frontend/src/Tests/serviceRoutes.test.js) reads Java controllers and compares HTTP verb plus normalized path: IDs become wildcards and query strings are removed. The successful scan compared 85 service calls against 114 distinct backend endpoint shapes. It establishes path existence, not payload fields, response schema, authorization or URL builders. Five HTTP call sites bypass domain modules: Login's sign-in/forgot password, RegisterModal's registration, and homepage ContestCard's vote/join.

[unwrapApiPayload](../../frontend/src/services/serviceUtils.js) and [queryFn.unwrap](../../frontend/src/api/queryFn.js) handle Axios responses containing `ApiResponse`, paginated `PageResponse` and historical raw objects/arrays/scalars. Login/registration actually return raw `UserResponseVO` with `accessToken`, which their forms read directly. Vote count/status are raw number/boolean. TS annotations are not reliable evidence of the live payload schema.

### Judge capabilities: present and incomplete

- Assigned competition queue exists in `Rating.jsx`, including a competition-detail dialog; Review is enabled only for `COMPLETED`.
- `JudgeSubmissions.jsx` lists approved entries, marks previously scored items, opens judging detail, and links to first score/revision.
- `RatingDetail.jsx` has 0-10 criterion sliders with step 0.1, initial score 5, equal weights `1 / criteria.length`, feedback and POST `/judges/score`.
- `ReRating.jsx` seeds previous scores/weights/feedback and PUTs `/judges/{id}`.
- There is no separate `Judge/` module, Judge dashboard/profile or Judge-specific navigation/login selection. The queue URL only admits Participant accounts. An assigned Participant can use this journey; a distinct Judge-role account cannot reach that queue normally.
- Organizer comparison and automatic awarding have pages. The published-winner API `/winners/public-list` has a service method but no production caller or public winner page. There is no manual winner override.

## Server state, sessions and shared modules

[QueryProvider](../../frontend/src/providers/QueryProvider.jsx) owns a client for one session generation: default staleTime 30 seconds, garbage collection 15 minutes, focus/reconnect refetch, at most two retries for transient failures, no retries for 400/401/403/404/409/422 or mutations. Token, user ID or role changes clear the old client, replace it with a new client and remount the provider subtree. An unchanged session or email-only edit retains the client. Named tiers in [queryKeys.js](../../frontend/src/api/queryKeys.js) are live 0, short 30 seconds, medium 5 minutes and long 15 minutes. Domain prefixes support invalidation; some feature suffixes are composed at call sites.

- [useProfileEditor](../../frontend/src/shared/hooks/useProfileEditor.js) owns profile query, guarded form seeding, profile/avatar writes and account deletion for three roles. It validates image MIME/5 MiB, sanitizes filenames, and revokes preview URLs.
- [useCommentThread](../../frontend/src/shared/hooks/useCommentThread.js) owns pagination, posting/replies, editing/deletion and thread invalidation. Posting optimistically patches page 1 and rolls back failures.
- [ViewVote](../../frontend/src/Participant/ViewVote.jsx) shares count/status caches, cancels reads before optimistic toggles, rolls back errors and invalidates on settlement.
- Registration/withdrawal and team membership use optimistic state; account/competition list deletions also use optimistic removal. Other writes usually invalidate/refetch.
- `useQueries` parallelizes WorkList vote tallies, organizer reporting, Project/TeamRegistrations submission enrichment and MyTeamsDialog creator details. These are cached fan-outs; request count still grows with list size.
- Active shared reuse includes comment components, ConfirmDialog, EmptyState, PageSkeleton, root ErrorBoundary, and user/team form schemas.

[authTokenManager](../../frontend/src/auth/authTokenManager.js) alone reads/writes auth storage keys `token`, `userId`, `email`, `role`. It provides a stable frozen snapshot and a session generation, emits same-tab events and filters cross-tab storage changes to auth keys. Clearing and re-establishing the same token still advances the generation; unrelated storage changes do not notify subscribers. [AuthContext](../../frontend/src/context/AuthContext.jsx) uses `useSyncExternalStore` and retains the existing login/logout/user/token interface.

[apiClient](../../frontend/src/api/apiClient.js) uses `VITE_API_BASE_URL` or `http://localhost:8080`, a 15-second timeout, Bearer/identity headers and FormData-aware content type. Its synchronous request interceptor captures the session generation and credentials before dispatch. Successes and failures from an older generation become `CanceledError`; an old 401 cannot expire a new account. Only a 401 for the current authenticated token clears the session and redirects to `/login`.

Logout calls [userService.logout](../../frontend/src/services/userService.ts) with the captured current token, then clears the local session immediately even if the server is unreachable. [Topbar](../../frontend/src/layouts/Topbar.tsx) delegates revocation and clearing to AuthContext. The old logout response cannot clear a subsequent login. Server revocation remains best-effort when the HTTP request fails.

Cache clearing alone cannot cancel every mutation callback. QueryProvider replaces pending old mutations' `mutationFn` before clearing, so a mutation waiting for optimistic `onMutate` work cannot later start under the next account's credentials. Late rollbacks retain their old client reference and cannot write to the new cache. The keyed provider also resets feature-local state on an account transition. Its subscription catches login from a child mount effect, and StrictMode effect replay does not discard an unchanged session's cache. [sessionLifecycle.test.jsx](../../frontend/src/auth/__tests__/sessionLifecycle.test.jsx) exercises these boundaries through the actual providers and Axios instance.

## UI, accessibility and motion

[index.css](../../frontend/src/index.css) owns light/dark HSL tokens, Tailwind `@theme` bridges including semantic foreground pairs, global focus rings, skip links and reduced-motion reset. Local Inter and JetBrains Mono are active; Cal Sans from the historical ADR is not loaded by `main.jsx`. [ThemeProvider](../../frontend/src/providers/ThemeProvider.tsx) uses next-themes, class-based themes, `theme` storage and system preference by default.

Motion tokens are page 150 ms, card 200 ms and modal 180 ms. Semantic classes handle route fades, cards and Radix dialog/sheet/popover states. PageTransition retriggers a class without remounting the route subtree. Hero uses Framer Motion under root reducedMotion policy. Component-local `duration-*` classes still exist in sidebar/homepage cards, so not every duration is centralized.

Both layouts provide a skip link and `main#main`; authenticated main has `tabIndex=-1`. Radix supplies overlay/menu primitives. Native tables, selects and sliders remain in feature pages. Lazy route splitting and aspect-ratio covers exist; this source scan does not measure runtime image/font performance.

## Verified risks and incomplete contracts

These initial-scan observations remain open after the cleanup. Passing unit tests does not resolve them. Session/cache isolation and server logout were fixed in this pass and are recorded separately below.

| Finding | Evidence and consequence |
|---|---|
| Homepage sample cards invoke live writes with synthetic IDs | `TopValues.jsx:14-58` hardcodes dated sample competitions and `:79-90` passes array index 0-3 as ID. `ContestCard.jsx:44-45` uses it as submissionId for voting and `:70` as competition ID for registration. Endpoint existence does not validate these entities. |
| Distinct Judge role has no queue entry | `App.jsx:107-113` makes `/rating/:email` Participant-only; `Sidebar.tsx:60-88` handles Participant/Organizer/Admin only; `RoleSelectModal.jsx:44-67` offers Participant/Organizer. Scoring subroutes merely require authentication. RatingFlow unit tests mount pages directly and do not prove app entry for Judge accounts. |
| OAuth buttons target frontend origin | `RegisterModal.jsx:357,369` goes to `/users/oauth/...` directly. API-origin builders in `userService.ts:61-65` are unused. `vite.config.js:16-22` only proxies `/api`, so Vite does not proxy these `/users` requests. Deployment must explicitly route them or buttons must use the API origin. |
| Types drift from live schemas | `types/index.ts:11` declares ENDED/CANCELLED instead of COMPLETED/AWARDED/CANCELED; User uses username/bio instead of name/description; `types/api.ts:23-44` registration/profile fields differ from live forms; `userService.ts:13-24` declares token/enveloped sessions while login returns raw accessToken. `checkJs:false` leaves JS usage unvalidated by tsc. |
| Scoring accessibility/loading/error gaps | `RatingDetail.jsx:94-107,114-126` and `ReRating.jsx:99-112,119-131` Labels lack linked IDs; submit buttons remain enabled during mutations and query errors are not rendered. `JudgeSubmissions.jsx:187-205` icon pagination lacks accessible names; search is placeholder-only. Existing axe coverage omits these pages. |
| Keyboard gaps outside sampled pages | Collapsed Sidebar links remove visible text at `Sidebar.tsx:118` and rely on tooltip content; `SubmissionRatings.jsx:125-140` sorts using clickable th elements without keyboard handlers/buttons. Existing browser tests do not exercise those states. |
| Published winner display absent | `judgeService.js:41` defines getPublicList; no production consumer exists. Auto-award is present but public results are not a completed UI journey. |
| Pagination hides real records | `UserContestList.jsx:54-70,104-107` requests no page/size, then paginates only the returned slice; `CompetitionsController.java:112-115` defaults to 10 records. `WorkList.jsx:50-59` similarly requests only the first default 10 approved submissions and has no server pagination. `TeamRegistrations.jsx:41-46,62-69,215-217,308` initializes pages to 0, never copies pages from teamsPage, and only displays navigation when pages > 1; teams beyond its first 10 are unreachable. Fixtures contain one or two rows and do not catch these larger-list paths. |

The backend judging API permits completion or an end date in the past; `Rating.jsx:118` only enables Review for COMPLETED, potentially hiding permitted work. Score-page seed refs are not keyed by route IDs and PageTransition preserves the subtree, so same-component ID changes need a route-change test.

## Resolved scan findings and cleanup evidence

| Initial finding | Current implementation and acceptance evidence |
|---|---|
| Private cache survives account changes | Resolved by one QueryClient per session generation, old-client clearing and provider replacement. Lifecycle tests switch A to B, reject old responses and 401s, isolate late rollback, and stop a delayed old mutation from dispatching with B's token. Private query keys may still omit identity, but they now live within an identity-isolated client. |
| Browser logout skips server invalidation | Resolved by AuthContext invoking `/users/logout` before immediate local clearing. Tests verify the old token on the request and preserve a later login after logout success, 401 or network failure. Failed server revocation is not claimed as a successful blacklist update. |
| Homepage/dialog axe result depends on animation readiness | The initial rerun captured one serious contrast rule on 12 HeroPreview nodes during a fade (ratios 1.36-1.76); a settled-opacity probe had zero violations. The first architecture run also caught a Radix dialog during CSS fade and passed on retry. [a11y.spec.js](../../frontend/e2e/a11y.spec.js) now waits for finite CSS animations and visible content's final opacity before axe. [playwright.config.ts](../../frontend/playwright.config.ts) limits concurrent workers to two and removes an unused reporter callback. The final full-suite run passed all 35 checks with retries disabled. Product motion and color tokens were unchanged. |

Static import traversal from `main.jsx`, followed by repository caller searches, confirmed the deleted modules had no production entry. The cleanup removed 23 files from `src`: `useApiQuery`, `useAsync`, `useAuthToken`, `routeManifest/useRoute`, `useContestFiltering/ContestListView`, FormField, AsyncBoundary, primitives/StatusBadge and its barrel, the unused scroll-area primitive, Homepages/Loading, Tours and its animation JSON, PublicUser/WorkDetail and ContestDetail, old Participant AddComment/DeleteComment/ProjectComment, competitionSchema, services/index.js, and the empty App.css. The empty App.css import was removed from App.jsx. Active details remain PublicContestDetail and Participant/contest/ContestDetail, and active comments remain behind useCommentThread.

Five unused direct dependencies were removed from package.json and the lockfile: `@lottiefiles/react-lottie-player`, `@radix-ui/react-scroll-area`, `dayjs`, `@testing-library/user-event` and `vite-tsconfig-paths`. Two obsolete ExcelJS/Lottie Jest mocks and their unused mappings were deleted. Five tests that exercised only the removed comment components were removed; active comment and registration tests remain. The new lifecycle suite adds 13 acceptance cases, bringing the final Jest total to 186.

Runtime traversal alone does not justify deleting type declarations. `types/index.ts` and `types/api.ts` remain because service modules import their types; `vite-env.d.ts` supplies build-time Vite declarations. The active production import graph has no unresolved local imports after the cleanup.

## Current cleanup validation (2026-10-04)

| Check | Result |
|---|---|
| `npm test -- --runInBand` | Passed: 36 suites, 186 tests |
| `npm run build` | Passed; production Vite build |
| Local `tsc --noEmit` | Passed, with checkJs:false |
| `npm run test:e2e -- --retries=0` | Passed: 35 tests, 2 workers, no retries; 1.1 minutes |

The lifecycle suite checks account/cache isolation, unchanged-session reuse, failed and successful server logout, old success/401 rejection, current-token expiry, same-token logout/re-login, delayed optimistic work, late rollback, cross-tab clearing, StrictMode and login before the provider subscription. These are behavioral checks at the public session/provider/HTTP interfaces. Current E2E evidence is `.git/audit/2026-10-04/architecture-e2e-final.log`; the first architecture run (34 passed / 1 flaky) remains in architecture-e2e.log. See [the cleanup record](../architecture-cleanup-2026-10-04.md) for combined acceptance evidence.

## Initial scan validation and coverage boundaries (2026-10-04)

The results below describe the pre-cleanup scan and remain as historical evidence. They do not override the current validation table.

| Check | Result |
|---|---|
| `npm test -- --runInBand` | Passed: 35 suites, 178 tests, 0 snapshots; 76.731 seconds |
| `npm run build` | Passed: Vite 8.1.5, 3,143 transformed modules; 2.83 seconds |
| Local `tsc --noEmit` | Passed, with checkJs:false |
| `playwright test --list` | 35 tests across 7 files |
| Chromium install | Passed; Playwright browser runtime downloaded into the existing machine cache, without project dependency changes |
| `npm run test:e2e` (8 workers) | Failed: 27 passed, 5 flaky, 3 failed; 3.7 minutes. Initial 8 timeouts; 3 retries then hit browser-launch timeout (180 seconds). No axe rule failure in this first run. |
| Public-page axe loop rerun (1 worker, retries 0) | 10 tests: 9 passed, 1 failed; 30.8 seconds. Original failed loop declarations regenerated all 10 light/dark public-page checks; Participant and keyboard tests were not repeated. Homepage failed color-contrast during its entrance animation. |
| Targeted settled homepage axe probe | Passed in light mode at 1280x720: preview opacity 1, zero WCAG A/AA violations; text color rgb(15,23,41). This diagnoses the failing check's readiness gap and does not change its recorded failure. |

Initial scan build chunks: index JS 166.80 kB (gzip 52.29), vendor 213.81 kB (68.07), Homepage 131.57 kB (42.66), chart chunk 381.06 kB (100.68). These are historical artifact sizes, not current bundle sizes or page-load measurements. No chunk-size warning was emitted; the build does not automatically run TypeScript or browser tests.

Jest covers role guards, session manager, query/adapters/cache isolation, endpoint existence, motion, empty/loading/error states, public pages and several Participant/Organizer/Admin workflows. Browser specs cover Participant comments, contests, profile, projects, rating queue and teams plus axe/keyboard checks. Axe samples five public pages in light/dark, one authenticated contest page, one dialog and keyboard landmarks; it does not scan all routes, roles, mobile layouts or scoring forms. Participant specs and authenticated axe paths stub selected APIs and seed auth locally. The public axe-page loop has no API stubs: with the backend unavailable, catalogue scans can inspect empty/error surfaces. Neither run proves real gateway/DB/OAuth/MinIO journeys or full populated-page accessibility.

Initial-scan raw logs are local under `.git/scan-2026-10-04/`: frontend-jest.log, frontend-build.log, frontend-typescript.log, frontend-e2e-list.log, frontend-playwright-install.log, frontend-e2e.log, frontend-e2e-rerun.log and frontend-homepage-settled-axe.log. Generated build/, playwright-report/, test-results/ and coverage directories must remain untracked. The initial mapping scan changed no product source; the subsequent architecture pass made the cleanup and session changes documented above.
