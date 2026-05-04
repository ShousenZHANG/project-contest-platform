/** API request/response shapes for each service domain. */

import type { Competition, User, Team, Submission, PageResponse } from './index';

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

export interface UpdateCompetitionRequest extends Partial<CreateCompetitionRequest> {}

// User service
export type UserListResponse = PageResponse<User>;

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: User['role'];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  avatarUrl?: string;
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
export type TeamListResponse = PageResponse<Team>;

export interface CreateTeamRequest {
  name: string;
  description?: string;
  maxMembers: number;
  competitionId?: string;
}

export interface UpdateTeamRequest extends Partial<CreateTeamRequest> {}

// Judge service
export interface ScoreRequest {
  score: number;
  comment?: string;
  criteria?: Record<string, number>;
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
