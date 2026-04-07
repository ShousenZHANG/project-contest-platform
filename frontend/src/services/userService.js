import apiClient from '../api/apiClient';

export const userService = {
  register: (data) => apiClient.post('/users/register', data),
  login: (data) => apiClient.post('/users/login', data),
  logout: () => apiClient.post('/users/logout'),
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  uploadAvatar: (formData) => apiClient.post('/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  forgotPassword: (email) => apiClient.post(`/users/forgot-password?email=${encodeURIComponent(email)}`),
  resetPassword: (data) => apiClient.post('/users/reset-password', data),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  getUsersByIds: (ids) => apiClient.post('/users/query-by-ids', ids),
  getUsersByEmails: (emails) => apiClient.post('/users/query-by-emails', emails),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
  listUsersAdmin: (params) => apiClient.get('/users/admin/list', { params }),
  oauthGithub: (role) => `${apiClient.defaults.baseURL}/users/oauth/github?role=${role}`,
  oauthGoogle: (role) => `${apiClient.defaults.baseURL}/users/oauth/google?role=${role}`,
};
