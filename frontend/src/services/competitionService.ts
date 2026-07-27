/**
 * competitionService.ts
 *
 * Every path here is checked against CompetitionsController. The module
 * previously carried invented routes (`/competitions/my`, `/public/overview`,
 * `/organizer/dashboard`, `POST /competitions/create`) that no component ever
 * called, so nothing failed loudly enough to notice.
 */

import apiClient from '../api/apiClient';
import type { AxiosResponse } from 'axios';
import type { Competition, ApiResponse } from '../types/index';
import type {
  CompetitionListResponse,
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  PaginationParams,
} from '../types/api';

export interface AssignJudgesRequest {
  /** The controller matches judges by email address, not by id. */
  judgeEmails: string[];
}

export const competitionService = {
  /** Paged, filterable list. `GET /competitions/list` */
  list: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<CompetitionListResponse>>> =>
    apiClient.get('/competitions/list', { params }),

  /** Public catalogue. `GET /competitions/public/all` */
  getPublicAll: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<CompetitionListResponse>>> =>
    apiClient.get('/competitions/public/all', { params }),

  getById: (id: string): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.get(`/competitions/${id}`),

  /**
   * Every competition the signed-in organizer owns.
   *
   * The path really is `achieve` — see CompetitionsController. It reads as a
   * typo for `archive` but it is the published contract.
   */
  getMyOrganized: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<Competition[]>>> =>
    apiClient.get('/competitions/achieve/my', { params }),

  getByIds: (ids: string[]): Promise<AxiosResponse<ApiResponse<Competition[]>>> =>
    apiClient.post('/competitions/batch/ids', ids),

  create: (data: CreateCompetitionRequest): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.post('/competitions', data),

  update: (id: string, data: UpdateCompetitionRequest): Promise<AxiosResponse<ApiResponse<Competition>>> =>
    apiClient.put(`/competitions/update/${id}`, data),

  updateStatus: (id: string, status: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.put(`/competitions/${id}/status`, null, { params: { status } }),

  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/competitions/delete/${id}`),

  isOrganizer: (competitionId: string): Promise<AxiosResponse<ApiResponse<boolean>>> =>
    apiClient.get('/competitions/is-organizer', { params: { competitionId } }),

  uploadMedia: (id: string, formData: FormData): Promise<AxiosResponse<ApiResponse<string[]>>> =>
    apiClient.post(`/competitions/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Removes one image; the target is identified by its URL, not an id. */
  deleteImage: (id: string, imageUrl: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/competitions/${id}/media/image`, { params: { imageUrl } }),

  deleteVideo: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/competitions/${id}/media/video`),

  assignJudges: (competitionId: string, data: AssignJudgesRequest): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post(`/competitions/${competitionId}/assign-judges`, data),

  getJudges: (
    competitionId: string,
    params?: PaginationParams
  ): Promise<AxiosResponse<ApiResponse<unknown[]>>> =>
    apiClient.get(`/competitions/${competitionId}/judges`, { params }),

  removeJudge: (competitionId: string, judgeId: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.delete(`/competitions/${competitionId}/judges/${judgeId}`),
};
