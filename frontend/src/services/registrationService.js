/**
 * registrationService.js
 *
 * Registration and submission endpoints.
 *
 * Checked against CompetitionParticipantsController and
 * SubmissionRecordsController. The previous version invented
 * `/registrations/register`, `/registrations/competitions/{id}/participants`,
 * `/submissions/submit`, `/submissions/my`, `/submissions/competition/{id}`
 * and `/submissions/download/{id}`; none of them exist and nothing imported
 * this module, so none of them ever failed.
 */

import apiClient from '../api/apiClient';

export const registrationService = {
  /** Register the signed-in user for a competition. */
  register: (competitionId) => apiClient.post(`/registrations/${competitionId}`),

  /** Withdraw the signed-in user from a competition. */
  cancel: (competitionId) => apiClient.delete(`/registrations/${competitionId}`),

  /** Whether the signed-in user is registered. */
  getStatus: (competitionId) => apiClient.get(`/registrations/${competitionId}/status`),

  getMyRegistrations: (params) => apiClient.get('/registrations/my', { params }),

  getParticipants: (competitionId, params) =>
    apiClient.get(`/registrations/${competitionId}/participants`, { params }),

  /** Organizer removing a participant. */
  removeParticipant: (competitionId, participantUserId) =>
    apiClient.delete(`/registrations/${competitionId}/participants/${participantUserId}`),

  registerTeam: (competitionId, teamId) =>
    apiClient.post(`/registrations/teams/${competitionId}/${teamId}`),

  cancelTeam: (competitionId, teamId) =>
    apiClient.delete(`/registrations/teams/${competitionId}/${teamId}`),

  getTeamStatus: (competitionId, teamId) =>
    apiClient.get(`/registrations/teams/${competitionId}/${teamId}/status`),

  getRegisteredTeams: (competitionId, params) =>
    apiClient.get(`/registrations/public/${competitionId}/teams`, { params }),

  /** Every competition a team is registered for. */
  getTeamCompetitions: (teamId, params) =>
    apiClient.get(`/registrations/teams/${teamId}/competitions`, { params }),

  /** Organizer removing a whole team from a competition. */
  removeTeam: (competitionId, teamId) =>
    apiClient.delete(`/registrations/teams/${competitionId}/team/${teamId}/by-organizer`),
};

export const submissionService = {
  /** Individual submission upload. */
  upload: (formData) =>
    apiClient.post('/submissions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Team submission upload. */
  uploadForTeam: (formData) =>
    apiClient.post('/submissions/teams/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Organizer view of a competition's submissions, paged and filterable. */
  getPublic: (params) => apiClient.get('/submissions/public', { params }),

  /** Public gallery — approved entries only. */
  getApproved: (params) => apiClient.get('/submissions/public/approved', { params }),

  getApprovedTeams: (params) => apiClient.get('/submissions/public/teams/approved', { params }),

  getTeamSubmission: (competitionId, teamId) =>
    apiClient.get(`/submissions/public/teams/${competitionId}/${teamId}`),

  /** The signed-in participant's own submission for a competition. */
  getMine: (competitionId) => apiClient.get(`/submissions/${competitionId}`),

  delete: (submissionId) => apiClient.delete(`/submissions/${submissionId}`),

  deleteTeamSubmission: (submissionId) =>
    apiClient.delete(`/submissions/teams/${submissionId}`),

  /** Organizer approving or rejecting a submission. */
  review: (data) => apiClient.post('/submissions/review', data),
};
