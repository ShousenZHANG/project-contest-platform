import apiClient from '../api/apiClient';

export const registrationService = {
  register: (data) => apiClient.post('/registrations/register', data),
  getMyRegistrations: (params) => apiClient.get('/registrations/my', { params }),
  getParticipants: (competitionId, params) => apiClient.get(`/registrations/competitions/${competitionId}/participants`, { params }),
  cancel: (registrationId) => apiClient.delete(`/registrations/${registrationId}`),
};

export const submissionService = {
  submit: (formData) => apiClient.post('/submissions/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMySubmissions: (params) => apiClient.get('/submissions/my', { params }),
  getByCompetition: (competitionId, params) => apiClient.get(`/submissions/competition/${competitionId}`, { params }),
  getById: (id) => apiClient.get(`/submissions/${id}`),
  getScoreStatistics: (competitionId) => apiClient.get(`/submissions/competition/${competitionId}/score-statistics`),
  download: (fileId) => apiClient.get(`/submissions/download/${fileId}`, { responseType: 'blob' }),
};
