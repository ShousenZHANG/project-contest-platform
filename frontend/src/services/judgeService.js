/**
 * judgeService.js
 *
 * Judging, winner selection and dashboard reads.
 *
 * Every path is checked against the judge-service controllers. The previous
 * version of this module was written against routes that do not exist
 * (`/judges/submissions/{id}`, `/judges/my-reviews/{id}`,
 * `/winners/competition/{id}`, `/dashboard/admin|organizer|participant`);
 * no component imported it, so none of them ever failed.
 */

import apiClient from '../api/apiClient';

export const judgeService = {
  /** Competitions the signed-in judge is assigned to. `GET /judges/my-competitions` */
  getMyCompetitions: (params) => apiClient.get('/judges/my-competitions', { params }),

  /** Submissions awaiting this judge. `GET /judges/pending-submissions` */
  getPendingSubmissions: (params) => apiClient.get('/judges/pending-submissions', { params }),

  /** One submission with its judging detail attached. */
  getSubmissionDetail: (submissionId) => apiClient.get(`/judges/${submissionId}/detail`),

  /** Whether the signed-in user judges this competition. */
  isJudge: (competitionId) => apiClient.get('/judges/is-judge', { params: { competitionId } }),

  /** First score for a submission. The id travels in the body, not the path. */
  score: (data) => apiClient.post('/judges/score', data),

  /** Revise a score already given. */
  updateScore: (submissionId, data) => apiClient.put(`/judges/${submissionId}`, data),
};

export const winnerService = {
  /** Runs award selection for a competition. `POST /winners/auto-award` */
  autoAward: (competitionId) =>
    apiClient.post('/winners/auto-award', null, { params: { competitionId } }),

  /** Published winners. */
  getPublicList: (params) => apiClient.get('/winners/public-list', { params }),

  /** Scored entries behind the winner list. */
  getScoredList: (params) => apiClient.get('/winners/scored-list', { params }),
};

export const dashboardService = {
  /** Whole-platform totals and trends, used by the admin dashboard. */
  getPlatformOverview: () => apiClient.get('/dashboard/public/platform-overview'),

  /** Per-competition statistics. */
  getCompetitionStatistics: (competitionId) =>
    apiClient.get('/dashboard/public/statistics', { params: { competitionId } }),
};
