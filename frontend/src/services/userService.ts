import apiClient from '../api/apiClient';
import type { AxiosResponse } from 'axios';
import type { User, ApiResponse, PageResponse } from '../types/index';
import type {
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
  ResetPasswordRequest,
  PaginationParams,
} from '../types/api';

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  role: User['role'];
}

export const userService = {
  register: (data: RegisterRequest): Promise<AxiosResponse<ApiResponse<AuthSession>>> =>
    apiClient.post('/users/register', data),

  login: (data: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthSession>>> =>
    apiClient.post('/users/login', data),

  logout: (): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post('/users/logout'),

  getProfile: (): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get('/users/profile'),

  updateProfile: (data: UpdateProfileRequest): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.put('/users/profile', data),

  uploadAvatar: (formData: FormData): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  forgotPassword: (email: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post(`/users/forgot-password?email=${encodeURIComponent(email)}`),

  resetPassword: (data: ResetPasswordRequest): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post('/users/reset-password', data),

  getUserById: (id: string): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get(`/users/${id}`),

  getUsersByIds: (ids: string[]): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    apiClient.post('/users/query-by-ids', ids),

  getUsersByEmails: (emails: string[]): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    apiClient.post('/users/query-by-emails', emails),

  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/users/${id}`),

  listUsersAdmin: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<PageResponse<User>>>> =>
    apiClient.get('/users/admin/list', { params }),

  oauthGithub: (role: User['role']): string =>
    `${apiClient.defaults.baseURL}/users/oauth/github?role=${role}`,

  oauthGoogle: (role: User['role']): string =>
    `${apiClient.defaults.baseURL}/users/oauth/google?role=${role}`,
};
