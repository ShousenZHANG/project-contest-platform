/**
 * interactionService.js
 *
 * Comments and votes on submissions.
 *
 * Checked against SubmissionInteractionController. The previous version put the
 * submission id in the path for every vote endpoint and invented
 * `/comments/submission/{id}` and `/votes/{id}/check`; the controller takes the
 * id as a query parameter throughout and the status endpoint is `/votes/status`.
 * Nothing imported this module, so none of it ever failed — except where a
 * component had copied the same mistake, which is how the homepage vote button
 * came to POST at a GET-only path.
 */

import apiClient from '../api/apiClient';

export const commentService = {
  /** Paged comments for a submission. `GET /interactions/comments/list` */
  getBySubmission: (submissionId, params) =>
    apiClient.get('/interactions/comments/list', {
      params: { submissionId, ...params },
    }),

  create: (data) => apiClient.post('/interactions/comments', data),

  update: (commentId, data) => apiClient.put(`/interactions/comments/${commentId}`, data),

  delete: (commentId) => apiClient.delete(`/interactions/comments/${commentId}`),
};

export const voteService = {
  /** Casts a vote. The id is a query parameter, not a path segment. */
  vote: (submissionId) =>
    apiClient.post('/interactions/votes', null, { params: { submissionId } }),

  unvote: (submissionId) =>
    apiClient.delete('/interactions/votes', { params: { submissionId } }),

  /** Returns a bare number, not an ApiResponse envelope. */
  getCount: (submissionId) =>
    apiClient.get('/interactions/votes/count', { params: { submissionId } }),

  /** Returns a bare boolean for the signed-in user. */
  hasVoted: (submissionId) =>
    apiClient.get('/interactions/votes/status', { params: { submissionId } }),
};
