import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import './App.css';

import { AppThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary, ToastProvider } from './shared/components';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

/* Lazy-loaded route pages */
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

/* Participant Pages */
const Profile = lazy(() => import('./Participant/profile/Profile'));
const Contest = lazy(() => import('./Participant/contest/Contest'));
const PContestDetail = lazy(() => import('./Participant/contest/ContestDetail'));
const Project = lazy(() => import('./Participant/project/Project'));
const Rating = lazy(() => import('./Participant/Rating'));
const ViewSubmission = lazy(() => import('./Participant/contest/ViewSubmission'));
const CommentsPage = lazy(() => import('./Participant/contest/CommentsPage'));
const ProjectDetail = lazy(() => import('./Participant/project/Projectdetail'));
const JudgeSubmissions = lazy(() => import('./Participant/JudgeSubmissions'));
const RatingDetail = lazy(() => import('./Participant/RatingDetail'));
const ReRating = lazy(() => import('./Participant/ReRating'));
const TeamProjectDetail = lazy(() => import('./Participant/team/TeamProjectDetail'));
const TeamPage = lazy(() => import('./Participant/team/TeamPage'));

/* Organizer Pages */
const OrganizerProfile = lazy(() => import('./Organizer/Profile'));
const OrganizerDashboard = lazy(() => import('./Organizer/Dashboard'));
const OrganizerContestList = lazy(() => import('./Organizer/ContestList'));
const OrganizerContest = lazy(() => import('./Organizer/Contest'));
const OrganizerEditContest = lazy(() => import('./Organizer/EditContest'));
const OrganizerUploadMedia = lazy(() => import('./Organizer/UploadMedia'));
const OrganizerParticipantList = lazy(() => import('./Organizer/ParticipantList'));
const OrganizerSubmissions = lazy(() => import('./Organizer/CheckSubmissions'));
const SubmissionRatings = lazy(() => import('./Organizer/SubmissionRatings'));
const OrganizerAddJudge = lazy(() => import('./Organizer/OrganizerAddJudge'));

/* Admin Pages */
const AdminProfile = lazy(() => import('./Admin/AdminProfile'));
const AdminAccountManage = lazy(() => import('./Admin/AdminAccountManage'));
const AdminCompetitionsManage = lazy(() => import('./Admin/AdminCompetitionsManage'));
const AdminDashboard = lazy(() => import('./Admin/AdminDashboard'));

/* Public User Pages */
const ContestList = lazy(() => import('./PublicUser/UserContestList'));
const PublicContestDetail = lazy(() => import('./PublicUser/PublicContestDetail'));
const HowToUse = lazy(() => import('./PublicUser/HowToUse'));
const WorkList = lazy(() => import('./PublicUser/WorkList'));
const LoginForm = lazy(() => import('./Homepages/Login'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const PublicuserComents = lazy(() => import('./PublicUser/ComentsPage'));
const TeamListPage = lazy(() => import('./PublicUser/TeamListPage'));
const TeamPublicDetail = lazy(() => import('./PublicUser/TeamPublicDetail'));

/* Homepage */
const HomePage = lazy(() => import('./Homepages/Homepage'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

function App() {
  return (
    <AppThemeProvider>
    <ErrorBoundary>
    <ToastProvider>
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ── Public routes (no sidebar) ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/how-to-use" element={<HowToUse />} />
            <Route path="/contest-list" element={<ContestList />} />
            <Route path="/publiccontest-detail/:id" element={<PublicContestDetail />} />
            <Route path="/work-list" element={<WorkList />} />
            <Route path="/publicusercoments/:submissionId" element={<PublicuserComents />} />
            <Route path="/public-teams/:contestId" element={<TeamListPage />} />
            <Route path="/public-team-detail/:competitionId/:teamId" element={<TeamPublicDetail />} />
          </Route>

          {/* ── Participant routes (dashboard layout) ── */}
          <Route element={<ProtectedRoute roles={["Participant"]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/profile/:email" element={<Profile />} />
            <Route path="/contest/:email" element={<Contest />} />
            <Route path="/teams/:email" element={<TeamPage />} />
            <Route path="/project/:email" element={<Project />} />
            <Route path="/rating/:email" element={<Rating />} />
          </Route>

          {/* Participant sub-pages (also use dashboard layout) */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/contest-detail/:id" element={<PContestDetail />} />
            <Route path="/JudgeSubmissions/:competitionId" element={<JudgeSubmissions />} />
            <Route path="/RatingDetail/:competitionId/:submissionId" element={<RatingDetail />} />
            <Route path="/ReRating/:competitionId/:submissionId" element={<ReRating />} />
            <Route path="/view-submission/:competitionId" element={<ViewSubmission />} />
            <Route path="/comments/:submissionId" element={<CommentsPage />} />
            <Route path="/team-project-detail/:competitionId/team/:teamId" element={<TeamProjectDetail />} />
            <Route path="/project-detail/:competitionId" element={<ProjectDetail />} />
          </Route>

          {/* ── Organizer routes (dashboard layout) ── */}
          <Route element={<ProtectedRoute roles={["Organizer"]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/OrganizerProfile/:email" element={<OrganizerProfile />} />
            <Route path="/OrganizerDashboard/:email" element={<OrganizerDashboard />} />
            <Route path="/OrganizerContestList/:email" element={<OrganizerContestList />} />
            <Route path="/OrganizerContest/:email" element={<OrganizerContest />} />
            <Route path="/OrganizerEditContest/:email" element={<OrganizerEditContest />} />
            <Route path="/OrganizerUploadMedia/:id" element={<OrganizerUploadMedia />} />
            <Route path="/OrganizerParticipantList/:competitionId" element={<OrganizerParticipantList />} />
            <Route path="/OrganizerSubmissions/:competitionId" element={<OrganizerSubmissions />} />
            <Route path="/submissions/:competitionId/ratings" element={<SubmissionRatings />} />
            <Route path="/OrganizerAddJudge/:competitionId" element={<OrganizerAddJudge />} />
          </Route>

          {/* ── Admin routes (dashboard layout) ── */}
          <Route element={<ProtectedRoute roles={["Admin"]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/AdminProfile" element={<AdminProfile />} />
            <Route path="/AdminAccountManage" element={<AdminAccountManage />} />
            <Route path="/AllCompetitions" element={<AdminCompetitionsManage />} />
            <Route path="/AdminDashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
    </AppThemeProvider>
  );
}

export default App;
