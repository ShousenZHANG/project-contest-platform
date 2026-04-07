import apiClient from '../api/apiClient';

export const competitionService = {
  getAll: (params) => apiClient.get('/competitions/public/all', { params }),
  getById: (id) => apiClient.get(`/competitions/public/${id}`),
  create: (data) => apiClient.post('/competitions/create', data),
  update: (id, data) => apiClient.put(`/competitions/${id}`, data),
  delete: (id) => apiClient.delete(`/competitions/${id}`),
  getMyCompetitions: (params) => apiClient.get('/competitions/my', { params }),
  uploadMedia: (id, formData) => apiClient.post(`/competitions/${id}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getOverview: () => apiClient.get('/competitions/public/overview'),
  getOrganizerDashboard: () => apiClient.get('/competitions/organizer/dashboard'),
  assignJudge: (competitionId, data) => apiClient.post(`/competitions/${competitionId}/judges`, data),
  getJudges: (competitionId) => apiClient.get(`/competitions/${competitionId}/judges`),
};
