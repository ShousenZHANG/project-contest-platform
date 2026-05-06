<!-- Updated: 2026-05-06 -->
# Dependencies & External Integrations

## Infrastructure Services

| Service | Image | Purpose |
|---------|-------|---------|
| MySQL 8.0.42 | mysql:8.0.42 | Primary datastore, single DB |
| Redis 7.4.3 | redis:7.4.3 | JWT token cache, session management |
| RabbitMQ 4.0.7 | rabbitmq:4.0.7-management | Async event messaging |
| Nacos 2.5.1 | nacos/nacos-server:v2.5.1 | Service discovery |
| MinIO | minio/minio | S3-compatible object storage |
| Jenkins | jenkins/jenkins:jdk21 | CI/CD pipeline |

## External Integrations

- **GitHub OAuth**: `GithubOAuthClient` + `GithubUserClient`
- **Google OAuth**: `GoogleOAuthClient` + `GoogleUserClient`
- **SMTP**: Gmail via Spring Mail
- **MinIO**: file-service uploads avatars, submissions, and competition media

## Backend Dependencies

| Library | Purpose |
|---------|---------|
| Spring Boot 3.4.3 | Application framework |
| Spring Cloud 2024.0.1 | Microservice infrastructure |
| Spring Cloud Alibaba 2023.0.3.2 | Nacos discovery |
| Spring Cloud Gateway | API gateway routing |
| OpenFeign | Declarative inter-service HTTP |
| MyBatis-Plus | ORM, pagination, auto-fill |
| Hutool | JWT and utilities |
| Knife4j + SpringDoc | OpenAPI documentation |
| JaCoCo | Test coverage |
| Mockito + AssertJ + WireMock | Backend tests |

## Frontend Dependencies

| Library | Purpose |
|---------|---------|
| React 19 + Vite | Frontend runtime/build |
| Tailwind CSS 4 | Utility CSS and design tokens |
| Radix primitives | Accessible UI primitives |
| lucide-react | Icons |
| Axios | HTTP client |
| TanStack Query | Server state |
| React Router 6 | Client-side routing |
| Sonner | Toast notifications |
| Framer Motion | Motion |
| Recharts | Charts |
| Jest + Testing Library | Unit/component tests |

## Dependency Hygiene

- `material-icons` and `react-icons` are removed from `package.json`; use `lucide-react`.
- `frontend/package-lock.json` is ignored in this repository. If the team wants lockfile-based installs, remove it from `.gitignore` and commit one canonical lockfile.
