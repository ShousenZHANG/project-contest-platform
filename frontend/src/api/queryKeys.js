/**
 * queryKeys.js
 *
 * Single source of truth for React Query cache keys.
 *
 * Keys are built as arrays that widen from general to specific, so a mutation
 * can invalidate exactly as much as it needs to:
 *
 *   invalidateQueries({ queryKey: queryKeys.competitions.all })      // everything
 *   invalidateQueries({ queryKey: queryKeys.competitions.lists() })  // every list
 *   invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
 *
 * Never inline a key at a call site. A key spelled slightly differently in two
 * places is two cache entries that silently drift apart.
 */

/** Normalizes optional query params so `undefined` and `{}` hit the same cache entry. */
const params = (value) => value ?? {};

export const queryKeys = {
  competitions: {
    all: ['competitions'],
    lists: () => [...queryKeys.competitions.all, 'list'],
    list: (p) => [...queryKeys.competitions.lists(), params(p)],
    mine: (p) => [...queryKeys.competitions.all, 'mine', params(p)],
    details: () => [...queryKeys.competitions.all, 'detail'],
    detail: (id) => [...queryKeys.competitions.details(), id],
    judges: (id) => [...queryKeys.competitions.detail(id), 'judges'],
    overview: () => [...queryKeys.competitions.all, 'overview'],
  },

  users: {
    all: ['users'],
    profile: () => [...queryKeys.users.all, 'profile'],
    details: () => [...queryKeys.users.all, 'detail'],
    detail: (id) => [...queryKeys.users.details(), id],
    byIds: (ids) => [...queryKeys.users.all, 'byIds', [...(ids ?? [])].sort()],
    byEmails: (emails) => [...queryKeys.users.all, 'byEmails', [...(emails ?? [])].sort()],
    adminList: (p) => [...queryKeys.users.all, 'adminList', params(p)],
  },

  teams: {
    all: ['teams'],
    lists: () => [...queryKeys.teams.all, 'list'],
    list: (p) => [...queryKeys.teams.lists(), params(p)],
    created: (p) => [...queryKeys.teams.all, 'created', params(p)],
    myJoined: (p) => [...queryKeys.teams.all, 'myJoined', params(p)],
    details: () => [...queryKeys.teams.all, 'detail'],
    detail: (teamId) => [...queryKeys.teams.details(), teamId],
    members: (teamId) => [...queryKeys.teams.detail(teamId), 'members'],
    creator: (teamId) => [...queryKeys.teams.detail(teamId), 'creator'],
    isMember: (userId, teamId) => [...queryKeys.teams.all, 'isMember', userId, teamId],
    joinedIds: (userId) => [...queryKeys.teams.all, 'joinedIds', userId],
  },

  registrations: {
    all: ['registrations'],
    mine: (p) => [...queryKeys.registrations.all, 'mine', params(p)],
    participants: (competitionId, p) => [
      ...queryKeys.registrations.all,
      'participants',
      competitionId,
      params(p),
    ],
  },

  submissions: {
    all: ['submissions'],
    mine: (p) => [...queryKeys.submissions.all, 'mine', params(p)],
    byCompetition: (competitionId, p) => [
      ...queryKeys.submissions.all,
      'byCompetition',
      competitionId,
      params(p),
    ],
    details: () => [...queryKeys.submissions.all, 'detail'],
    detail: (id) => [...queryKeys.submissions.details(), id],
    scoreStatistics: (competitionId) => [
      ...queryKeys.submissions.all,
      'scoreStatistics',
      competitionId,
    ],
  },

  judges: {
    all: ['judges'],
    assignedSubmissions: (competitionId, p) => [
      ...queryKeys.judges.all,
      'assignedSubmissions',
      competitionId,
      params(p),
    ],
    myReviews: (competitionId) => [...queryKeys.judges.all, 'myReviews', competitionId],
  },

  winners: {
    all: ['winners'],
    byCompetition: (competitionId) => [...queryKeys.winners.all, competitionId],
  },

  dashboard: {
    all: ['dashboard'],
    admin: () => [...queryKeys.dashboard.all, 'admin'],
    organizer: () => [...queryKeys.dashboard.all, 'organizer'],
    participant: () => [...queryKeys.dashboard.all, 'participant'],
  },

  comments: {
    all: ['comments'],
    bySubmission: (submissionId, p) => [
      ...queryKeys.comments.all,
      'bySubmission',
      submissionId,
      params(p),
    ],
  },

  votes: {
    all: ['votes'],
    count: (submissionId) => [...queryKeys.votes.all, 'count', submissionId],
    hasVoted: (submissionId) => [...queryKeys.votes.all, 'hasVoted', submissionId],
  },
};

/**
 * staleTime tiers, in milliseconds.
 *
 * Pick by how fast the data actually goes out of date, not by how important it
 * feels. Anything above `live` means a revisit inside the window renders from
 * cache with no spinner, which is the whole point.
 */
export const staleTime = {
  /** Vote counts, live scores — always refetch. */
  live: 0,
  /** Lists that move as people register, submit or score. */
  short: 30_000,
  /** Detail pages and dashboards. */
  medium: 5 * 60_000,
  /** Profiles, team membership, things that change by hand. */
  long: 15 * 60_000,
};

export default queryKeys;
