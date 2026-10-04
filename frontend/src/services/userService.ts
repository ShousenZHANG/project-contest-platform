import apiClient from '../api/apiClient';
import type { AxiosResponse } from 'axios';
import type { User, UserRole, UserProfile, AdminUser, AuthSession, ApiResponse, PageResponse } from '../types/index';
import type {
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
  ResetPasswordRequest,
  PaginationParams,
} from '../types/api';

export interface AdminUserFilterParams extends PaginationParams {
  role?: UserRole;
  keyword?: string;
  sortBy?: 'createdAt' | 'name' | 'email';
  order?: 'asc' | 'desc';
}

export const userService = {
  provisionJudge: (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<AxiosResponse<User>> =>
    apiClient.post('/users/admin/accounts', { ...data, role: 'JUDGE' }),
  register: (data: RegisterRequest): Promise<AxiosResponse<AuthSession>> =>
    apiClient.post('/users/register', data),

  login: (data: LoginRequest): Promise<AxiosResponse<AuthSession>> =>
    apiClient.post('/users/login', data),

  logout: (): Promise<AxiosResponse<ApiResponse<string>>> => apiClient.post('/users/logout'),

  getProfile: (): Promise<AxiosResponse<UserProfile>> => apiClient.get('/users/profile'),

  updateProfile: (data: UpdateProfileRequest): Promise<AxiosResponse<UserProfile>> =>
    apiClient.put('/users/profile', data),

  uploadAvatar: (formData: FormData): Promise<AxiosResponse<UserProfile>> =>
    apiClient.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  forgotPassword: (email: string): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.post(`/users/forgot-password?email=${encodeURIComponent(email)}`),

  resetPassword: (data: ResetPasswordRequest): Promise<AxiosResponse<AuthSession>> =>
    apiClient.post('/users/reset-password', data),

  getUserById: (id: string): Promise<AxiosResponse<User>> =>
    apiClient.get(`/users/${id}`),

  getUsersByIds: (ids: string[]): Promise<AxiosResponse<User[]>> =>
    apiClient.post('/users/query-by-ids', ids),

  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.delete(`/users/${id}`),

  listUsersAdmin: (
    params?: AdminUserFilterParams,
  ): Promise<AxiosResponse<PageResponse<AdminUser>>> =>
    apiClient.get('/users/admin/list', { params }),

  oauthGithub: (role: RegisterRequest['role']): string =>
    `${(apiClient.defaults.baseURL ?? '').replace(/\/+$/, '')}/users/oauth/github?role=${encodeURIComponent(role)}`,

  oauthGoogle: (role: RegisterRequest['role']): string =>
    `${(apiClient.defaults.baseURL ?? '').replace(/\/+$/, '')}/users/oauth/google?role=${encodeURIComponent(role)}`,
};
