import apiClient from '../api/apiClient';

export const judgeService = {
  getAssignedSubmissions: (competitionId, params) => apiClient.get(`/judges/submissions/${competitionId}`, { params }),
  scoreSubmission: (submissionId, data) => apiClient.post(`/judges/score/${submissionId}`, data),
  updateScore: (submissionId, data) => apiClient.put(`/judges/score/${submissionId}`, data),
  getMyReviews: (competitionId) => apiClient.get(`/judges/my-reviews/${competitionId}`),
};

export const winnerService = {
  getWinners: (competitionId) => apiClient.get(`/winners/competition/${competitionId}`),
  selectWinners: (competitionId, data) => apiClient.post(`/winners/competition/${competitionId}/select`, data),
};

export const dashboardService = {
  getAdminDashboard: () => apiClient.get('/dashboard/admin'),
  getOrganizerDashboard: () => apiClient.get('/dashboard/organizer'),
  getParticipantDashboard: () => apiClient.get('/dashboard/participant'),
};
