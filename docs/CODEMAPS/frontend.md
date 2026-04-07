<!-- Generated: 2026-04-06 | Files scanned: 50+ | Token estimate: ~700 -->
# Frontend Architecture

## Tech Stack
React 19 + CRA | MUI 6 + Tailwind CSS 4 | React Router 6 | Axios | Framer Motion | Recharts

## Route Tree (from App.js)

### Public (no auth)
/                                    → HomePage (with 3s Loading splash)
/login                               → LoginForm
/reset-password                      → ResetPassword
/oauth/callback                      → OAuthCallback
/contest-list                        → UserContestList
/publiccontest-detail/:id            → PublicContestDetail
/work-list                           → WorkList
/how-to-use                          → HowToUse
/public-teams/:contestId             → TeamListPage
/public-team-detail/:compId/:teamId  → TeamPublicDetail
/publicusercoments/:submissionId     → PublicuserComments

### Participant (auth required)
/profile/:email                      → Profile
/contest/:email                      → Contest
/teams/:email                        → TeamPage
/project/:email                      → Project
/rating/:email                       → Rating
/contest-detail/:id                  → ContestDetail
/JudgeSubmissions/:competitionId     → JudgeSubmissions
/RatingDetail/:compId/:subId         → RatingDetail
/ReRating/:compId/:subId             → ReRating
/view-submission/:competitionId      → ViewSubmission
/comments/:submissionId              → CommentsPage
/project-detail/:competitionId       → ProjectDetail
/team-project-detail/:compId/team/:teamId → TeamProjectDetail

### Organizer (auth required)
/OrganizerProfile/:email             → OrganizerProfile
/OrganizerDashboard/:email           → OrganizerDashboard
/OrganizerContestList/:email         → OrganizerContestList
/OrganizerContest/:email             → OrganizerContest (create)
/OrganizerEditContest/:email         → OrganizerEditContest
/OrganizerUploadMedia/:id            → OrganizerUploadMedia
/OrganizerParticipantList/:compId    → OrganizerParticipantList
/OrganizerSubmissions/:compId        → CheckSubmissions
/submissions/:compId/ratings         → SubmissionRatings
/OrganizerAddJudge/:compId           → OrganizerAddJudge

### Admin (auth required)
/AdminProfile                        → AdminProfile
/AdminAccountManage                  → AdminAccountManage
/AllCompetitions                     → AdminCompetitionsManage
/AdminDashboard                      → AdminDashboard

## Directory Structure

```
frontend/src/
├── App.js              # Router config
├── Homepages/          # Homepage, Login, Loading splash
├── PublicUser/          # Public browsing (contest list, work list, how-to-use)
├── Participant/         # Participant views (profile, contest, project, rating, teams)
├── Organizer/           # Organizer management (dashboard, contests, submissions, judges)
├── Admin/               # Admin panels (accounts, competitions, dashboard)
├── pages/               # Shared pages (ResetPassword, OAuthCallback)
└── Tests/               # Jest test files
```

## API Communication
- Axios for all HTTP calls to gateway at :8080
- JWT stored client-side, sent as Authorization header
- Role-based routing: user role determines which module's pages are shown

## UI Libraries
- **MUI 6** (Material UI): DataGrid, DatePickers, TreeView, Charts, Icons
- **Tailwind CSS 4**: Utility-first styling
- **Framer Motion**: Page/component animations
- **Recharts**: Dashboard charts
- **Lottie**: Loading animations
- **react-image-crop**: Avatar cropping
- **exceljs + file-saver**: Export to Excel
