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
import type { Competition, User, ApiResponse, PageResponse } from '../types/index';
import type {
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  PaginationParams,
} from '../types/api';

export interface AssignJudgesRequest {
  /** The controller matches judges by email address, not by id. */
  judgeEmails: string[];
}

export interface CompetitionFilterParams extends PaginationParams {
  keyword?: string;
  status?: Competition['status'];
  category?: string;
  participationType?: Competition['participationType'];
}

export const competitionService = {
  /** Paged, filterable list. `GET /competitions/list` */
  list: (params?: CompetitionFilterParams): Promise<AxiosResponse<PageResponse<Competition>>> =>
    apiClient.get('/competitions/list', { params }),

  listAdmin: (params?: CompetitionFilterParams): Promise<AxiosResponse<PageResponse<Competition>>> =>
    apiClient.get('/competitions/admin/list', { params }),

  getById: (id: string): Promise<AxiosResponse<Competition>> =>
    apiClient.get(`/competitions/${id}`),

  getManagedById: (id: string): Promise<AxiosResponse<Competition>> =>
    apiClient.get(`/competitions/managed/${id}`),

  /**
   * Every competition the signed-in organizer owns.
   *
   * The path really is `achieve` — see CompetitionsController. It reads as a
   * typo for `archive` but it is the published contract.
   */
  getMyOrganized: (
    params?: CompetitionFilterParams,
  ): Promise<AxiosResponse<PageResponse<Competition>>> =>
    apiClient.get('/competitions/achieve/my', { params }),

  getByIds: (ids: string[]): Promise<AxiosResponse<Competition[]>> =>
    apiClient.post('/competitions/batch/ids', ids),

  create: (data: CreateCompetitionRequest): Promise<AxiosResponse<Competition>> =>
    apiClient.post('/competitions', data),

  update: (
    id: string,
    data: UpdateCompetitionRequest,
  ): Promise<AxiosResponse<Competition>> =>
    apiClient.put(`/competitions/update/${id}`, data),

  delete: (id: string): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.delete(`/competitions/delete/${id}`),

  isOrganizer: (competitionId: string): Promise<AxiosResponse<boolean>> =>
    apiClient.get('/competitions/is-organizer', { params: { competitionId } }),

  uploadMedia: (id: string, formData: FormData): Promise<AxiosResponse<Competition>> =>
    apiClient.post(`/competitions/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Removes one image; the target is identified by its URL, not an id. */
  deleteImage: (id: string, imageUrl: string): Promise<AxiosResponse<Competition>> =>
    apiClient.delete(`/competitions/${id}/media/image`, { params: { imageUrl } }),

  deleteVideo: (id: string): Promise<AxiosResponse<Competition>> =>
    apiClient.delete(`/competitions/${id}/media/video`),

  assignJudges: (
    competitionId: string,
    data: AssignJudgesRequest,
  ): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.post(`/competitions/${competitionId}/assign-judges`, data),

  getJudges: (
    competitionId: string,
    params?: PaginationParams,
  ): Promise<AxiosResponse<PageResponse<User>>> =>
    apiClient.get(`/competitions/${competitionId}/judges`, { params }),

  removeJudge: (
    competitionId: string,
    judgeId: string,
  ): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.delete(`/competitions/${competitionId}/judges/${judgeId}`),
};
