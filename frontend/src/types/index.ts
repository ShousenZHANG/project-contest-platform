/** Core domain types shared across the frontend. */

export interface Competition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  status: 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED';
  allowedSubmissionTypes: string[];
  scoringCriteria: string[];
  introVideoUrl?: string;
  imageUrls?: string[];
  participationType: 'INDIVIDUAL' | 'TEAM';
  createdAt: string;
}

export interface User {
  userId: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'JUDGE' | 'PARTICIPANT';
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId: string;
  memberCount: number;
  maxMembers: number;
  competitionId?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  competitionId: string;
  userId: string;
  title: string;
  description?: string;
  fileUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  role: User['role'];
}
