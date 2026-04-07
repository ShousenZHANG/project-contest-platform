import apiClient from '../api/apiClient';

export const teamService = {
  create: (data) => apiClient.post('/teams/create', data),
  update: (teamId, data) => apiClient.put(`/teams/${teamId}`, data),
  delete: (teamId) => apiClient.delete(`/teams/${teamId}`),
  join: (teamId) => apiClient.post(`/teams/${teamId}/join`),
  leave: (teamId) => apiClient.post(`/teams/${teamId}/leave`),
  removeMember: (teamId, memberId) => apiClient.delete(`/teams/${teamId}/members/${memberId}`),
  getById: (teamId) => apiClient.get(`/teams/public/${teamId}`),
  getAll: (params) => apiClient.get('/teams/public/all', { params }),
  getCreatedTeams: (params) => apiClient.get('/teams/public/created', { params }),
  getMyJoined: (params) => apiClient.get('/teams/my-joined', { params }),
  getMembers: (teamId) => apiClient.get(`/teams/public/${teamId}/members`),
  getCreator: (teamId) => apiClient.get(`/teams/${teamId}/creator`),
  isMember: (userId, teamId) => apiClient.get('/teams/public/is-member', { params: { userId, teamId } }),
  getJoinedIds: (userId) => apiClient.get('/teams/public/joined', { params: { userId } }),
  getBriefByIds: (ids) => apiClient.post('/teams/public/brief', ids),
};
