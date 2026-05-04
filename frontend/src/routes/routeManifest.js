/**
 * Central route manifest — single source of truth for all application routes.
 * Use useRoute() hook to build type-safe navigation links.
 *
 * roles: [] means public (no auth required).
 * roles with values restrict access to those role strings (matching ProtectedRoute usage).
 */
export const ROUTES = {
  // ── Public (no sidebar) ──────────────────────────────────────────────────
  HOME:                    { path: '/',                                          roles: [] },
  LOGIN:                   { path: '/login',                                     roles: [] },
  RESET_PASSWORD:          { path: '/reset-password',                            roles: [] },
  OAUTH_CALLBACK:          { path: '/oauth/callback',                            roles: [] },
  HOW_TO_USE:              { path: '/how-to-use',                                roles: [] },
  CONTEST_LIST:            { path: '/contest-list',                              roles: [] },
  PUBLIC_CONTEST_DETAIL:   { path: '/publiccontest-detail/:id',                  roles: [] },
  WORK_LIST:               { path: '/work-list',                                 roles: [] },
  PUBLIC_USER_COMMENTS:    { path: '/publicusercoments/:submissionId',           roles: [] },
  PUBLIC_TEAMS:            { path: '/public-teams/:contestId',                   roles: [] },
  PUBLIC_TEAM_DETAIL:      { path: '/public-team-detail/:competitionId/:teamId', roles: [] },

  // ── Participant (dashboard layout, role: Participant) ────────────────────
  PARTICIPANT_PROFILE:     { path: '/profile/:email',                            roles: ['Participant'] },
  PARTICIPANT_CONTEST:     { path: '/contest/:email',                            roles: ['Participant'] },
  PARTICIPANT_TEAMS:       { path: '/teams/:email',                              roles: ['Participant'] },
  PARTICIPANT_PROJECT:     { path: '/project/:email',                            roles: ['Participant'] },
  PARTICIPANT_RATING:      { path: '/rating/:email',                             roles: ['Participant'] },

  // ── Participant sub-pages (dashboard layout, any authenticated user) ─────
  CONTEST_DETAIL:          { path: '/contest-detail/:id',                        roles: [] },
  JUDGE_SUBMISSIONS:       { path: '/JudgeSubmissions/:competitionId',           roles: [] },
  RATING_DETAIL:           { path: '/RatingDetail/:competitionId/:submissionId', roles: [] },
  RE_RATING:               { path: '/ReRating/:competitionId/:submissionId',     roles: [] },
  VIEW_SUBMISSION:         { path: '/view-submission/:competitionId',            roles: [] },
  COMMENTS:                { path: '/comments/:submissionId',                    roles: [] },
  TEAM_PROJECT_DETAIL:     { path: '/team-project-detail/:competitionId/team/:teamId', roles: [] },
  PROJECT_DETAIL:          { path: '/project-detail/:competitionId',             roles: [] },

  // ── Organizer (dashboard layout, role: Organizer) ────────────────────────
  ORGANIZER_PROFILE:       { path: '/OrganizerProfile/:email',                  roles: ['Organizer'] },
  ORGANIZER_DASHBOARD:     { path: '/OrganizerDashboard/:email',                roles: ['Organizer'] },
  ORGANIZER_CONTEST_LIST:  { path: '/OrganizerContestList/:email',              roles: ['Organizer'] },
  ORGANIZER_CONTEST:       { path: '/OrganizerContest/:email',                  roles: ['Organizer'] },
  ORGANIZER_EDIT_CONTEST:  { path: '/OrganizerEditContest/:email',              roles: ['Organizer'] },
  ORGANIZER_UPLOAD_MEDIA:  { path: '/OrganizerUploadMedia/:id',                 roles: ['Organizer'] },
  ORGANIZER_PARTICIPANTS:  { path: '/OrganizerParticipantList/:competitionId',  roles: ['Organizer'] },
  ORGANIZER_SUBMISSIONS:   { path: '/OrganizerSubmissions/:competitionId',      roles: ['Organizer'] },
  SUBMISSION_RATINGS:      { path: '/submissions/:competitionId/ratings',       roles: ['Organizer'] },
  ORGANIZER_ADD_JUDGE:     { path: '/OrganizerAddJudge/:competitionId',         roles: ['Organizer'] },

  // ── Admin (dashboard layout, role: Admin) ────────────────────────────────
  ADMIN_PROFILE:           { path: '/AdminProfile',                             roles: ['Admin'] },
  ADMIN_ACCOUNTS:          { path: '/AdminAccountManage',                       roles: ['Admin'] },
  ADMIN_COMPETITIONS:      { path: '/AllCompetitions',                          roles: ['Admin'] },
  ADMIN_DASHBOARD:         { path: '/AdminDashboard',                           roles: ['Admin'] },
};
