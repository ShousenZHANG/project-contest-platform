# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Competition management platform for hackathons, innovation challenges, and academic contests. Backend is Java 23 + Spring Boot 3.4 microservices. Frontend is React 19 + Vite. Package group: `com.w16a.danish`.

## Build & Run Commands

### Full Stack (Docker)
```bash
docker-compose up --build -d          # Start everything
docker-compose down                   # Stop everything
```

### Backend (Maven multi-module)
```bash
./mvnw clean install                  # Build all modules
./mvnw clean install -pl backend/user-service  # Build single module
./mvnw test                           # Run all tests
./mvnw test -pl backend/user-service  # Test single module
./mvnw test -pl backend/user-service -Dtest=JwtUtilTest  # Single test class
```

### Frontend
```bash
cd frontend
npm install
npm run dev                           # Vite dev server on :3000
npm start                             # Alias for Vite dev server on :3000
npm test                              # Jest tests
npm run test:jest                     # Jest directly
npm run build                         # Production build
```

### Test Coverage
JaCoCo is configured in the parent POM. The `backend/coverage-report` module aggregates coverage across all services. Frontend coverage output is generated under `frontend/coverage-summary/` and must stay untracked.

## Architecture

### Microservices

All services register with Nacos and communicate through OpenFeign where cross-service calls are needed.

| Service | Port | Routes (via gateway) | Domain |
|---------|------|---------------------|--------|
| api-gateway | 8080 | All `/` prefixed routes | JWT auth filter, routing, CORS |
| user-service | 8081 | `/users/**`, `/teams/**` | Users, roles, OAuth, teams |
| competition-service | 8082 | `/competitions/**` | Competition CRUD, organizer/judge assignment |
| registration-service | 8083 | `/registrations/**`, `/submissions/**` | Registration, submissions |
| judge-service | 8084 | `/judges/**`, `/winners/**`, `/dashboard/**` | Scoring, reviews, winner selection |
| file-service | 8085 | `/files/**` | MinIO file upload/download |
| interaction-service | 8086 | `/interactions/**` | Voting, commenting on submissions |

### Infrastructure Dependencies

- **MySQL 8** (:3306) - Single database `project_contest_platform`, schema auto-created from `mysql-init/create_table.sql`
- **Redis 7** (:6379) - Session/token caching
- **RabbitMQ** (:5672, mgmt :15672) - Async notifications
- **Nacos** (:8848) - Service discovery
- **MinIO** (:9000, console :9001) - S3-compatible file storage

### Backend Patterns

- **ORM**: MyBatis-Plus with auto-fill (`MyMetaObjectHandler` for `created_at`/`updated_at`)
- **DTO/VO/PO layering**: `domain/dto/` input, `domain/vo/` output, `domain/po/` entity
- **Service interface + impl**: `service/I*Service.java` -> `service/impl/*ServiceImpl.java`
- **Inter-service calls**: OpenFeign clients in `feign/` packages, with fallbacks where configured
- **Async messaging**: RabbitMQ configs in each service's `config/*RabbitMQConfig.java`
- **Exception handling**: shared `BusinessException` + `GlobalExceptionHandler` from `backend/common-lib`
- **Response envelope**: use `ApiResponses` for standard `ApiResponse<T>` success/error payloads; keep file-service raw upload strings for Feign/file URL compatibility
- **API docs**: Knife4j/SpringDoc OpenAPI at `/doc.html`
- **Auth**: JWT via Hutool (`hutool-jwt`), validated in gateway's `JwtAuthFilter`; downstream services receive `User-ID` and `User-Role`

### Frontend Structure

- `src/pages/` - Route pages
- `src/Admin/`, `src/Organizer/`, `src/Participant/`, `src/PublicUser/` - Role-based UI modules
- `src/Homepages/` - Public landing and auth entry points
- `src/layouts/` - unified app shell, sidebar, topbar
- `src/components/ui/` - shadcn-style Radix primitives
- `src/shared/` - reusable domain UI modules and hooks
- `src/api/apiClient.js` - shared Axios adapter
- `src/auth/authTokenManager.js` - auth session module; do not access auth `localStorage` directly from business UI
- `src/Tests/` - Jest test files

Frontend stack: Vite, React Router v6, Tailwind CSS 4, Radix primitives, lucide-react, Sonner, Framer Motion, Recharts, Axios, TanStack Query.

## Environment Variables

Required at project root: `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. See `.env.example`.

## Key Conventions

- All services share the same parent POM; common dependencies are declared once at root level.
- Service hostnames in `application.yml` use Docker service names such as `mysql`, `redis`, `nacos`, and `rabbitmq`; adjust to `localhost` for local development outside Docker.
- Gateway `jwt.public-urls` controls which endpoints skip authentication.
- Authenticated controller tests generally need both `User-ID` and `User-Role` headers.
- Testing uses JUnit 5 + Mockito + AssertJ + WireMock on the backend and Jest + Testing Library on the frontend.
- Generated output such as `.DS_Store`, `frontend/coverage-summary/`, `frontend/playwright-report/`, `frontend/test-results/`, and `frontend/build/` must stay out of version control.

## Agent skills

### Issue tracker

GitHub Issues at `ShousenZHANG/project-contest-platform`, accessed via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical vocabulary (no remapping). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
