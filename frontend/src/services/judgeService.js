/**
 * judgeService.js
 *
 * Judging, winner selection and dashboard reads.
 *
 * Paths follow the judge-service controllers. Assigned submission context is
 * separate from this judge's persisted score so first-time judging has the
 * same file and criteria context as revisions.
 */

import apiClient from '../api/apiClient';

export const judgeService = {
  /** Competitions the signed-in judge is assigned to. `GET /judges/my-competitions` */
  getMyCompetitions: (params) => apiClient.get('/judges/my-competitions', { params }),

  /** Submissions awaiting this judge. `GET /judges/pending-submissions` */
  getPendingSubmissions: (params) => apiClient.get('/judges/pending-submissions', { params }),

  /** One submission with its judging detail attached. */
  getSubmissionDetail: (submissionId) => apiClient.get(`/judges/${submissionId}/detail`),
  getSubmissionContext: (submissionId, competitionId) =>
    apiClient.get(`/judges/submissions/${submissionId}`, { params: { competitionId } }),

  /** Whether the signed-in user judges this competition. */
  isJudge: (competitionId) => apiClient.get('/judges/is-judge', { params: { competitionId } }),

  /** First score for a submission. The id travels in the body, not the path. */
  score: (data) => apiClient.post('/judges/score', data),

  /** Revise a score already given. */
  updateScore: (submissionId, data) => apiClient.put(`/judges/${submissionId}`, data),
};

export const winnerService = {
  getEligibility: (competitionId) =>
    apiClient.get('/winners/eligibility', { params: { competitionId } }),
  /** Runs award selection for a competition. `POST /winners/auto-award` */
  autoAward: (competitionId) =>
    apiClient.post('/winners/auto-award', null, { params: { competitionId } }),

  /** Published winners. */
  getPublicList: (params) => apiClient.get('/winners/public-list', { params }),

  /** Finalized results for the owning Organizer or Admin, including private contests. */
  getManagedList: (params) => apiClient.get('/winners/list', { params }),

};

export const dashboardService = {
  /** Whole-platform totals and trends, used by the admin dashboard. */
  getPlatformOverview: () => apiClient.get('/dashboard/public/platform-overview'),

  getManagedCompetitionStatistics: (competitionId) =>
    apiClient.get('/dashboard/statistics', { params: { competitionId } }),
};
