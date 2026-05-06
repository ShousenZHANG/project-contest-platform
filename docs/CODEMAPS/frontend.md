<!-- Updated: 2026-05-06 -->
# Frontend Architecture

## Tech Stack

React 19 + Vite | Tailwind CSS 4 | shadcn-style Radix primitives | React Router 6 | Axios | TanStack Query | Sonner | Framer Motion | Recharts

## Route Groups

### Public

- `/` - homepage
- `/login` - login
- `/reset-password` - password reset
- `/oauth/callback` - OAuth callback
- `/contest-list`, `/publiccontest-detail/:id`, `/work-list`, `/how-to-use` - public browsing
- `/public-teams/:contestId`, `/public-team-detail/:compId/:teamId` - public team views

### Participant

- `/profile/:email`, `/contest/:email`, `/teams/:email`, `/project/:email`, `/rating/:email`
- `/contest-detail/:id`, `/view-submission/:competitionId`, `/comments/:submissionId`
- `/project-detail/:competitionId`, `/team-project-detail/:compId/team/:teamId`
- `/JudgeSubmissions/:competitionId`, `/RatingDetail/:compId/:subId`, `/ReRating/:compId/:subId`

### Organizer

- `/OrganizerProfile/:email`, `/OrganizerDashboard/:email`, `/OrganizerContestList/:email`
- `/OrganizerContest/:email`, `/OrganizerEditContest/:email`, `/OrganizerUploadMedia/:id`
- `/OrganizerParticipantList/:compId`, `/OrganizerSubmissions/:compId`, `/submissions/:compId/ratings`, `/OrganizerAddJudge/:compId`

### Admin

- `/AdminProfile`, `/AdminAccountManage`, `/AllCompetitions`, `/AdminDashboard`

## Key Modules

- `src/layouts/` - authenticated shell, topbar, sidebar, public layout
- `src/components/ui/` - Radix-based UI primitives
- `src/shared/components/` - reusable domain UI such as comments, empty states, confirmation dialog, skeletons
- `src/api/apiClient.js` - Axios adapter with auth headers and 401 handling
- `src/auth/authTokenManager.js` - auth session Module; business UI must not read/write auth `localStorage` directly
- `src/services/serviceUtils.js` - response Adapter that unwraps Axios responses, `ApiResponse<T>` envelopes, and historical raw payloads

## UI Policy

- Prefer shared shell/layout primitives over page-local fixed positioning.
- Prefer `ConfirmDialog`, Sonner toasts, and shared empty/loading/error states over native `alert`/`confirm`.
- Use lucide-react icons and Radix primitives. Do not reintroduce MUI or Material Icons without reopening ADR-0001.
- Keep generated reports (`coverage-summary`, `playwright-report`, `test-results`) untracked.
