<!-- Generated: 2026-04-06 | Files scanned: 95+ | Token estimate: ~950 -->
# Backend API Routes

## api-gateway (:8080)
JwtAuthFilter → validates JWT, sets User-ID/User-Role headers, routes via Spring Cloud Gateway

## user-service (:8081) — /users/**, /teams/**

### UsersController /users
POST   /register                    → register (email/password)
POST   /login                       → login (returns JWT)
POST   /logout                      → logout (invalidate token)
DELETE /{userId}                     → delete account
GET    /profile                     → get current user profile
PUT    /profile                     → update profile
POST   /profile/avatar              → upload avatar (multipart → file-service)
GET    /oauth/github                → redirect to GitHub OAuth
GET    /oauth/callback/github       → GitHub OAuth callback
GET    /oauth/google                → redirect to Google OAuth
GET    /oauth/callback/google       → Google OAuth callback
POST   /forgot-password             → send reset email
POST   /reset-password              → reset with token
POST   /query-by-ids                → batch get users by IDs (internal)
GET    /{userId}                    → get user by ID (internal)
POST   /query-by-emails             → batch get users by emails (internal)
GET    /admin/list                  → admin: paginated user list

### TeamController /teams
POST   /create                      → create team
DELETE /{teamId}/members/{memberId} → remove member
DELETE /{teamId}                    → delete/disband team
PUT    /{teamId}                    → update team info
POST   /{teamId}/join               → join team
POST   /{teamId}/leave              → leave team
GET    /public/{teamId}             → get team detail
GET    /public/created              → list teams created by user
GET    /my-joined                   → list teams user joined
GET    /public/all                  → list all teams (paginated)
GET    /{teamId}/creator            → get team creator info
POST   /public/brief                → batch get team briefs
GET    /public/is-member            → check membership
GET    /public/{teamId}/members     → list team members
GET    /public/joined               → list joined teams by userId

## competition-service (:8082) — /competitions/**

POST   /                            → create competition
GET    /{id}                        → get competition detail
GET    /list                        → list (paginated, filterable)
DELETE /delete/{id}                  → delete competition
PUT    /update/{id}                  → update competition
POST   /{id}/media                   → upload media (video/image)
DELETE /{id}/media/image             → delete image
DELETE /{id}/media/video             → delete intro video
GET    /achieve/my                   → list organizer's competitions
POST   /batch/ids                    → batch get by IDs (internal)
POST   /{id}/assign-judges           → assign judges
GET    /{id}/judges                  → list assigned judges
DELETE /{id}/judges/{judgeId}        → remove judge
GET    /is-organizer                 → check if user is organizer
GET    /public/all                   → list all (for dashboard)
PUT    /{id}/status                  → update status (internal)

## registration-service (:8083) — /registrations/**, /submissions/**

### CompetitionParticipantsController /registrations
POST   /{competitionId}                              → register individual
DELETE /{competitionId}                              → cancel registration
GET    /{competitionId}/participants                  → list participants
DELETE /{competitionId}/participants/{participantUserId} → remove participant
GET    /{competitionId}/status                       → check registration status
GET    /my                                           → list my registrations
POST   /teams/{competitionId}/{teamId}               → register team
DELETE /teams/{competitionId}/{teamId}               → cancel team registration
GET    /teams/{competitionId}/{teamId}/status         → team registration status
GET    /public/{competitionId}/teams                  → list registered teams
GET    /teams/{teamId}/competitions                   → team's competitions
DELETE /teams/{competitionId}/team/{teamId}/by-organizer → organizer removes team
GET    /internal/exists-registration-by-team          → check team registration (internal)
GET    /public/{competitionId}/statistics             → registration stats
GET    /public/{competitionId}/participant-trend       → participant trend
GET    /public/platform/participant-statistics         → platform-wide stats
GET    /public/platform/participant-trend              → platform-wide trend

### SubmissionRecordsController /submissions
POST   /upload                                        → upload submission
DELETE /{submissionId}                                → delete submission
GET    /{competitionId}                               → list submissions for competition
GET    /public                                        → public submission list
GET    /public/approved                               → approved submissions
POST   /review                                        → review submission (approve/reject)
GET    /is-organizer                                  → check organizer status
POST   /teams/upload                                  → team submission upload
GET    /public/teams/{competitionId}/{teamId}          → team submission detail
DELETE /teams/{submissionId}                           → delete team submission
GET    /teams/list                                    → list team submissions
GET    /public/teams/approved                          → approved team submissions
GET    /internal/exists-by-team                        → check team submission (internal)
GET    /statistics                                    → submission statistics
GET    /public/{competitionId}/submission-trend         → submission trend
GET    /public/platform/submission-statistics           → platform submission stats
GET    /public/platform/submission-trend                → platform submission trend

## judge-service (:8084) — /judges/**, /winners/**, /dashboard/**

### SubmissionJudgesController /judges
POST   /score                        → score a submission
GET    /is-judge                     → check if user is judge
GET    /{submissionId}/detail        → judge detail for submission
GET    /pending-submissions          → list pending submissions
PUT    /{submissionId}               → update judge score
GET    /my-competitions              → judge's assigned competitions

### SubmissionWinnersController /winners
POST   /auto-award                   → auto-calculate winners
GET    /public-list                  → public winner list
GET    /scored-list                  → scored submissions list

### DashboardController /dashboard
GET    /public/statistics            → competition statistics
GET    /public/platform-overview     → platform overview data

## file-service (:8085) — /files/**

POST   /upload/avatar                → upload avatar image
POST   /upload/promo                 → upload promo material
POST   /upload/submission            → upload submission file
DELETE /delete                       → delete file by URL

## interaction-service (:8086) — /interactions/**

POST   /comments                     → add comment
DELETE /comments/{id}                → delete comment
PUT    /comments/{id}                → update comment
GET    /comments/list                → list comments (paginated)
POST   /votes                        → vote for submission
DELETE /votes                        → remove vote
GET    /votes/count                  → get vote count
GET    /votes/status                 → check user vote status
GET    /statistics                   → interaction stats for submission
GET    /public/platform/interaction-statistics → platform interaction stats

## Service Layer Pattern (all services)

```
Controller → IService (interface) → ServiceImpl → Mapper (MyBatis-Plus)
                                  → FeignClient (cross-service)
                                  → Notifier (RabbitMQ producer)
```

## Key Files Per Service

```
config/     — MybatisPlusConfig, RabbitMQConfig, TimeZoneConfig, MyMetaObjectHandler
controller/ — REST endpoints
domain/     — dto/ (input), vo/ (output), po/ (entity), enums/, mq/ (messages)
service/    — IService interface + impl/
mapper/     — MyBatis-Plus mapper interfaces
feign/      — OpenFeign client interfaces
exception/  — BusinessException + GlobalExceptionHandler
```
