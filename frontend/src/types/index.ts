/** Core domain types shared across the frontend. */

import type { AxiosResponse } from 'axios';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'JUDGE' | 'PARTICIPANT';

export interface Competition {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  startDate: string;
  endDate: string;
  isPublic: boolean | null;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'AWARDED' | 'CANCELED';
  allowedSubmissionTypes: string[] | null;
  scoringCriteria: string[] | null;
  introVideoUrl?: string | null;
  imageUrls?: string[] | null;
  participationType: 'INDIVIDUAL' | 'TEAM';
  createdAt: string;
}

/** UserBriefVO. Contact fields may be redacted for another user's account. */
export interface User {
  id: string;
  name: string;
  email?: string | null;
  role?: UserRole | null;
  avatarUrl?: string | null;
  description?: string | null;
  createdAt?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  description?: string | null;
  avatarUrl?: string | null;
}

export interface AdminUser extends User {
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  role: 'LEADER' | 'MEMBER';
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

/** Public team lists use TeamSummaryVO, not the full TeamResponseVO. */
export interface TeamSummary {
  id: string;
  name: string;
  description?: string | null;
  leaderName?: string | null;
  memberCount: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  competitionId: string;
  revision: number;
  userId?: string | null;
  teamId?: string | null;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewComments?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  totalScore?: number | null;
  createdAt: string;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  firstPage: boolean;
  lastPage: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message?: string;
  error?: string | null;
}

export interface AuthSession {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  expiresIn: number;
}

/** Only queryFn/serviceUtils unwrap wire payloads; apiClient preserves Axios. */
export type ServicePayload<T> = T extends AxiosResponse<infer Body>
  ? Body extends ApiResponse<infer Data> ? Data : Body
  : T extends ApiResponse<infer Data> ? Data : T;
