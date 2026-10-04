/** API request/response shapes for each service domain. */

import type { Competition, UserRole, AdminUser, TeamSummary, Submission, PageResponse } from './index';

// Competition service
export type CompetitionListResponse = PageResponse<Competition>;
export type CompetitionDetailResponse = Competition;

export interface CreateCompetitionRequest {
  name: string;
  description?: string;
  category: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  participationType: 'INDIVIDUAL' | 'TEAM';
  allowedSubmissionTypes: string[];
  scoringCriteria?: string[];
}

export interface UpdateCompetitionRequest extends Partial<CreateCompetitionRequest> {
  status?: Competition['status'];
}

// User service
export type UserListResponse = PageResponse<AdminUser>;

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'PARTICIPANT' | 'ORGANIZER'>;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  description?: string;
  password?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Submission service
export type SubmissionListResponse = PageResponse<Submission>;

// Team service
export type TeamListResponse = PageResponse<TeamSummary>;

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest extends CreateTeamRequest {}

// Judge service
export interface ScoreRequest {
  competitionId: string;
  submissionId: string;
  judgeComments?: string;
  scores: Array<{ criterion: string; score: number }>;
}

// Registration service
export interface RegistrationRequest {
  competitionId: string;
  teamId?: string;
}

// Interaction service
export interface CreateCommentRequest {
  submissionId: string;
  content: string;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}
