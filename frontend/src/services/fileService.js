import apiClient from '../api/apiClient';

export const fileService = {
  upload: (formData) => apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  download: (folder, filename) => apiClient.get(`/files/download/${folder}/${filename}`, { responseType: 'blob' }),
  delete: (folder, filename) => apiClient.delete(`/files/${folder}/${filename}`),
};
