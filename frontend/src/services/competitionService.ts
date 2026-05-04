import apiClient from '../api/apiClient';
import type { AxiosResponse } from 'axios';
import type {
  Competition,
  ApiResponse,
  PageResponse,
} from '../types/index';
import type {
  CompetitionListResponse,
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  PaginationParams,
} from '../types/api';

export interface AssignJudgeRequest {
  judgeId: string;
  email?: string;
}

export const competitionService = {
  getAll: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<CompetitionListResponse>>> =>
    apiClient.get('/competitions/public/all', { params }),

  getById: (id: string): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.get(`/competitions/public/${id}`),

  create: (data: CreateCompetitionRequest): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.post('/competitions/create', data),

  update: (id: string, data: UpdateCompetitionRequest): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.put(`/competitions/${id}`, data),

  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/competitions/${id}`),

  getMyCompetitions: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<PageResponse<Competition>>>> =>
    apiClient.get('/competitions/my', { params }),

  uploadMedia: (id: string, formData: FormData): Promise<AxiosResponse<ApiResponse<string[]>>> =>
    apiClient.post(`/competitions/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getOverview: (): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    apiClient.get('/competitions/public/overview'),

  getOrganizerDashboard: (): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    apiClient.get('/competitions/organizer/dashboard'),

  assignJudge: (competitionId: string, data: AssignJudgeRequest): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post(`/competitions/${competitionId}/judges`, data),

  getJudges: (competitionId: string): Promise<AxiosResponse<ApiResponse<unknown[]>>> =>
    apiClient.get(`/competitions/${competitionId}/judges`),
};
