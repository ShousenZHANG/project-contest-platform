import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import ResetPassword from './pages/ResetPassword';

/* Participant Pages */
import Profile from './Participant/profile/Profile.js';
import Contest from './Participant/contest/Contest.js';
import PContestDetail from './Participant/contest/ContestDetail.js';
import Project from './Participant/project/Project.js';
import Rating from './Participant/Rating';
import ViewSubmission from "./Participant/contest/ViewSubmission.js";
import CommentsPage from "./Participant/contest/CommentsPage.js";
import ProjectDetail from './Participant/project/Projectdetail.js';
import JudgeSubmissions from './Participant/JudgeSubmissions';
import RatingDetail from './Participant/RatingDetail';
import ReRating from './Participant/ReRating';
import TeamProjectDetail from './Participant/team/TeamProjectDetail.js';
import TeamPage from './Participant/team/TeamPage.js';

/* Organizer Pages */
import OrganizerProfile from './Organizer/Profile';
import OrganizerDashboard from './Organizer/Dashboard';
import OrganizerContestList from './Organizer/ContestList';
import OrganizerContest from './Organizer/Contest';
import OrganizerEditContest from './Organizer/EditContest';
import OrganizerUploadMedia from './Organizer/UploadMedia';
import OrganizerParticipantList from './Organizer/ParticipantList';
import OrganizerSubmissions from './Organizer/CheckSubmissions';
import SubmissionRatings from './Organizer/SubmissionRatings';
import OrganizerAddJudge from './Organizer/OrganizerAddJudge';

/* Admin Pages */
import AdminProfile from './Admin/AdminProfile';
import AdminAccountManage from './Admin/AdminAccountManage';
import AdminCompetitionsManage from './Admin/AdminCompetitionsManage';
import AdminDashboard from './Admin/AdminDashboard';

/* Public User Pages */
import ContestList from './PublicUser/UserContestList.js';
import PublicContestDetail from './PublicUser/PublicContestDetail';
import HowToUse from './PublicUser/HowToUse';
import WorkList from './PublicUser/WorkList';
import LoginForm from './Homepages/Login';
import OAuthCallback from './pages/OAuthCallback';
import PublicuserComents from './PublicUser/ComentsPage';
import TeamListPage from './PublicUser/TeamListPage.js';
import TeamPublicDetail from './PublicUser/TeamPublicDetail.js';

/* Homepage and Loading */
import HomePage from './Homepages/Homepage';
import Loading from './Homepages/Loading.js';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
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

          {/* Participant routes */}
          <Route path="/profile/:email" element={<ProtectedRoute roles={["Participant"]}><Profile /></ProtectedRoute>} />
          <Route path="/contest/:email" element={<ProtectedRoute roles={["Participant"]}><Contest /></ProtectedRoute>} />
          <Route path="/teams/:email" element={<ProtectedRoute roles={["Participant"]}><TeamPage /></ProtectedRoute>} />
          <Route path="/project/:email" element={<ProtectedRoute roles={["Participant"]}><Project /></ProtectedRoute>} />
          <Route path="/rating/:email" element={<ProtectedRoute roles={["Participant", "Judge"]}><Rating /></ProtectedRoute>} />
          <Route path="/contest-detail/:id" element={<ProtectedRoute><PContestDetail /></ProtectedRoute>} />
          <Route path="/JudgeSubmissions/:competitionId" element={<ProtectedRoute roles={["Participant", "Judge"]}><JudgeSubmissions /></ProtectedRoute>} />
          <Route path="/RatingDetail/:competitionId/:submissionId" element={<ProtectedRoute><RatingDetail /></ProtectedRoute>} />
          <Route path="/ReRating/:competitionId/:submissionId" element={<ProtectedRoute><ReRating /></ProtectedRoute>} />
          <Route path="/view-submission/:competitionId" element={<ProtectedRoute><ViewSubmission /></ProtectedRoute>} />
          <Route path="/comments/:submissionId" element={<ProtectedRoute><CommentsPage /></ProtectedRoute>} />
          <Route path="/team-project-detail/:competitionId/team/:teamId" element={<ProtectedRoute><TeamProjectDetail /></ProtectedRoute>} />
          <Route path="/project-detail/:competitionId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

          {/* Organizer routes */}
          <Route path="/OrganizerProfile/:email" element={<ProtectedRoute roles={["Organizer"]}><OrganizerProfile /></ProtectedRoute>} />
          <Route path="/OrganizerDashboard/:email" element={<ProtectedRoute roles={["Organizer"]}><OrganizerDashboard /></ProtectedRoute>} />
          <Route path="/OrganizerContestList/:email" element={<ProtectedRoute roles={["Organizer"]}><OrganizerContestList /></ProtectedRoute>} />
          <Route path="/OrganizerContest/:email" element={<ProtectedRoute roles={["Organizer"]}><OrganizerContest /></ProtectedRoute>} />
          <Route path="/OrganizerEditContest/:email" element={<ProtectedRoute roles={["Organizer"]}><OrganizerEditContest /></ProtectedRoute>} />
          <Route path="/OrganizerUploadMedia/:id" element={<ProtectedRoute roles={["Organizer"]}><OrganizerUploadMedia /></ProtectedRoute>} />
          <Route path="/OrganizerParticipantList/:competitionId" element={<ProtectedRoute roles={["Organizer"]}><OrganizerParticipantList /></ProtectedRoute>} />
          <Route path="/OrganizerSubmissions/:competitionId" element={<ProtectedRoute roles={["Organizer"]}><OrganizerSubmissions /></ProtectedRoute>} />
          <Route path="/submissions/:competitionId/ratings" element={<ProtectedRoute roles={["Organizer"]}><SubmissionRatings /></ProtectedRoute>} />
          <Route path="/OrganizerAddJudge/:competitionId" element={<ProtectedRoute roles={["Organizer"]}><OrganizerAddJudge /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/AdminProfile" element={<ProtectedRoute roles={["Admin"]}><AdminProfile /></ProtectedRoute>} />
          <Route path="/AdminAccountManage" element={<ProtectedRoute roles={["Admin"]}><AdminAccountManage /></ProtectedRoute>} />
          <Route path="/AllCompetitions" element={<ProtectedRoute roles={["Admin"]}><AdminCompetitionsManage /></ProtectedRoute>} />
          <Route path="/AdminDashboard" element={<ProtectedRoute roles={["Admin"]}><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
