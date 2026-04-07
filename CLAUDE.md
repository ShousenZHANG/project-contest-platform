# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Competition management platform (hackathons, innovation challenges, academic contests). Java 23 Spring Boot 3.4 microservices backend + React 19 CRA frontend. Package group: `com.w16a.danish`.

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
npm start                             # Dev server on :3000
npm test                              # Jest tests (react-scripts)
npm run test:jest                     # Jest directly
npm run build                         # Production build
```

### Test Coverage
JaCoCo is configured in the parent POM. The `backend/coverage-report` module aggregates coverage across all services.

## Architecture

### Microservices (all register with Nacos, communicate via OpenFeign)

| Service | Port | Routes (via gateway) | Domain |
|---------|------|---------------------|--------|
| api-gateway | 8080 | All `/` prefixed routes | JWT auth filter, routing, CORS |
| user-service | 8081 | `/users/**`, `/teams/**` | Users, roles, OAuth (GitHub/Google), teams |
| competition-service | 8082 | `/competitions/**` | Competition CRUD, organizer/judge assignment |
| registration-service | 8083 | `/registrations/**`, `/submissions/**` | Registration, submissions |
| judge-service | 8084 | `/judges/**`, `/winners/**`, `/dashboard/**` | Scoring, reviews, winner selection |
| file-service | 8085 | `/files/**` | MinIO file upload/download |
| interaction-service | 8086 | `/interactions/**` | Voting, commenting on submissions |

### Infrastructure Dependencies
- **MySQL 8** (:3306) — Single database `project_contest_platform`, schema auto-created from `mysql-init/create_table.sql`
- **Redis 7** (:6379) — Session/token caching
- **RabbitMQ** (:5672, mgmt :15672) — Async notifications (judge assignment, awards, registration events)
- **Nacos** (:8848) — Service discovery
- **MinIO** (:9000, console :9001) — S3-compatible file storage

### Backend Patterns
- **ORM**: MyBatis-Plus with auto-fill (`MyMetaObjectHandler` for created_at/updated_at)
- **DTO/VO/PO layering**: `domain/dto/` (input), `domain/vo/` (output), `domain/po/` (entity)
- **Service interface + impl**: `service/I*Service.java` → `service/impl/*ServiceImpl.java`
- **Inter-service calls**: OpenFeign clients in `feign/` package
- **Async messaging**: RabbitMQ configs in each service's `config/*RabbitMQConfig.java`
- **Exception handling**: `BusinessException` + `GlobalExceptionHandler` per service
- **API docs**: Knife4j/SpringDoc OpenAPI at `/doc.html`
- **Auth**: JWT via Hutool (`hutool-jwt`), validated in gateway's `JwtAuthFilter`

### Frontend Structure
- `src/pages/` — Route pages
- `src/Admin/`, `src/Organizer/`, `src/Participant/`, `src/PublicUser/` — Role-based UI modules
- `src/Homepages/` — Landing/home pages
- `src/Tests/` — Test files
- UI: MUI (Material UI) + Tailwind CSS + Framer Motion
- HTTP: Axios
- Routing: React Router v6

### Environment Variables (`.env` at project root)
Required: `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. See `.env.example`.

## Key Conventions

- All services share the same parent POM — common dependencies (Spring Cloud, Redis, RabbitMQ, validation, Lombok, test libs) are declared once at root level
- Service hostnames in application.yml use Docker service names (e.g., `mysql`, `redis`, `nacos`, `rabbitmq`) — adjust to `localhost` for local dev outside Docker
- Gateway `jwt.public-urls` controls which endpoints skip authentication
- Each service has its own `GlobalExceptionHandler` — not shared across modules
- Testing uses JUnit 5 + Mockito + AssertJ + WireMock
