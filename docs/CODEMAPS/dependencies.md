<!-- Generated: 2026-04-06 | Files scanned: 10 | Token estimate: ~600 -->
# Dependencies & External Integrations

## Infrastructure Services

| Service | Image | Purpose |
|---------|-------|---------|
| MySQL 8.0.42 | mysql:8.0.42 | Primary datastore, single DB |
| Redis 7.4.3 | redis:7.4.3 | JWT token cache, session management |
| RabbitMQ 4.0.7 | rabbitmq:4.0.7-management | Async event messaging (email notifications) |
| Nacos 2.5.1 | nacos/nacos-server:v2.5.1 | Service discovery (standalone mode) |
| MinIO | minio/minio | S3-compatible object storage (avatars, submissions, promo media) |
| Jenkins | jenkins/jenkins:jdk21 | CI/CD pipeline |

## External API Integrations

### OAuth Providers (user-service)
- **GitHub OAuth**: GithubOAuthClient + GithubUserClient (Feign → github.com)
- **Google OAuth**: GoogleOAuthClient + GoogleUserClient (Feign → googleapis.com)

### Email (user-service)
- **SMTP**: Gmail via Spring Mail (smtp.gmail.com:587, STARTTLS)
- All notification emails consumed from RabbitMQ queues by user-service listeners

## Backend Dependencies (parent POM)

| Library | Version | Purpose |
|---------|---------|---------|
| Spring Boot | 3.4.3 | Application framework |
| Spring Cloud | 2024.0.1 | Microservice infrastructure |
| Spring Cloud Alibaba | 2023.0.3.2 | Nacos discovery |
| Spring Cloud Gateway | (managed) | API gateway routing |
| OpenFeign | 4.2.1 | Declarative inter-service HTTP |
| MyBatis-Plus | (per-service) | ORM with auto-fill, pagination |
| Hutool | 5.8.36 | JWT handling, utilities |
| Lombok | 1.18.36 | Boilerplate reduction |
| Knife4j | 4.4.0 | Swagger UI (OpenAPI 3.0) |
| SpringDoc | 2.8.5 | OpenAPI generation |
| JaCoCo | 0.8.13 | Test coverage reporting |
| Mockito | 5.17.0 | Unit test mocking |
| AssertJ | 3.27.3 | Fluent test assertions |
| WireMock | 3.13.0 | HTTP mock server for tests |

## Service-Specific Dependencies

### file-service
- MinIO Java SDK (S3-compatible client)
- Custom FileValidator for type/size checking

### user-service
- Spring Mail (email sending)
- BCrypt (password hashing via Spring Security Crypto)
- feign-form (multipart file upload)

### api-gateway
- Spring Cloud Gateway (reactive routing)
- Spring Data Redis (token validation)

## Frontend Dependencies (package.json)

| Library | Purpose |
|---------|---------|
| React 19 + react-scripts 5 | Framework (CRA) |
| MUI 6 (material, icons, x-data-grid, x-date-pickers, x-charts) | UI components |
| Tailwind CSS 4 | Utility CSS |
| Axios | HTTP client |
| React Router 6 | Client-side routing |
| Framer Motion | Animations |
| Recharts | Dashboard charts |
| exceljs + file-saver | Excel export |
| dayjs | Date handling |
| Lottie | Loading animations |
| Jest 29 + Testing Library | Unit tests |

## Docker Build

Each backend service has its own `Dockerfile` at `backend/<service>/Dockerfile`.
Frontend Dockerfile at `frontend/Dockerfile`.
All orchestrated via `docker-compose.yml` with a shared `my-network` bridge.
