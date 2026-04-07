import apiClient from '../api/apiClient';

export const commentService = {
  getBySubmission: (submissionId, params) => apiClient.get(`/interactions/comments/submission/${submissionId}`, { params }),
  create: (data) => apiClient.post('/interactions/comments', data),
  delete: (commentId) => apiClient.delete(`/interactions/comments/${commentId}`),
};

export const voteService = {
  vote: (submissionId) => apiClient.post(`/interactions/votes/${submissionId}`),
  unvote: (submissionId) => apiClient.delete(`/interactions/votes/${submissionId}`),
  getCount: (submissionId) => apiClient.get(`/interactions/votes/${submissionId}/count`),
  hasVoted: (submissionId) => apiClient.get(`/interactions/votes/${submissionId}/check`),
};
