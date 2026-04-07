<p align="center">
  <img src="frontend/public/logo192.png" alt="Questora" width="80" />
</p>

<h1 align="center">Questora — Competition Management Platform</h1>

<p align="center">
  <strong>Enterprise-grade microservices platform for hackathons, innovation challenges, and academic contests</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &nbsp;&bull;&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;&bull;&nbsp;
  <a href="#features">Features</a> &nbsp;&bull;&nbsp;
  <a href="#tech-stack">Tech Stack</a> &nbsp;&bull;&nbsp;
  <a href="#api-docs">API Docs</a> &nbsp;&bull;&nbsp;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-23-orange?logo=openjdk&logoColor=white" alt="Java 23" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Overview

Questora is a full-stack competition management platform that enables organizations to create, manage, and run competitions at scale. It supports **multi-judge scoring**, **individual and team participation**, **real-time notifications**, and **OAuth authentication** — all powered by a production-ready microservices backend.

**Use cases:** hackathons, innovation challenges, academic contests, open competitions, internal company events.

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Git

### 1. Clone & Configure

```bash
git clone https://github.com/ShousenZHANG/project-contest-platform.git
cd project-contest-platform
```

Create a `.env` file in the project root:

```env
JWT_SECRET=your-jwt-secret

MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-smtp-app-password

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Launch

```bash
docker-compose up --build -d
```

> First startup takes a few minutes for image builds and database initialization.

### 3. Verify Database

After all containers are running, connect to MySQL with any client to confirm tables are initialized:

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `3306` |
| User | `root` |
| Password | `root` |
| Database | `project_contest_platform` |

> This verification step ensures JDBC connections are established before accessing the platform.

### 4. Access

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Docs** (Swagger) | http://localhost:8080/doc.html |
| **RabbitMQ** Dashboard | http://localhost:15672 (guest / guest) |
| **Nacos** Console | http://localhost:8848/nacos (nacos / nacos) |
| **MinIO** Console | http://localhost:9001 (minio / minio123) |

### Default Admin Credentials

| Email | Password |
|-------|----------|
| admin@gmail.com | TestJwt1234 |

> Select any role during login — the system recognizes the admin account automatically.

---

## Architecture

```
                         ┌─────────────────┐
                         │   React + Vite   │
                         │   Frontend :3000  │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │   API Gateway     │
                         │   :8080 (JWT)     │
                         └────────┬─────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┬───────────┐
          │           │           │           │           │           │
   ┌──────▼──┐ ┌──────▼──┐ ┌─────▼───┐ ┌─────▼───┐ ┌─────▼───┐ ┌────▼────┐
   │  User   │ │  Comp.  │ │  Reg.   │ │  Judge  │ │  File   │ │ Inter.  │
   │ Service │ │ Service │ │ Service │ │ Service │ │ Service │ │ Service │
   │  :8081  │ │  :8082  │ │  :8083  │ │  :8084  │ │  :8085  │ │  :8086  │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │           │           │
   ┌────▼───────────▼───────────▼───────────▼───────────▼───────────▼────┐
   │                        Infrastructure                               │
   │  MySQL 8.0  ·  Redis 7  ·  RabbitMQ  ·  Nacos  ·  MinIO            │
   └─────────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 8080 | JWT auth filter, request routing, CORS |
| **User Service** | 8081 | Users, roles, OAuth (GitHub/Google), teams |
| **Competition Service** | 8082 | Competition CRUD, organizer/judge assignment |
| **Registration Service** | 8083 | Registrations, submissions, file uploads |
| **Judge Service** | 8084 | Scoring, reviews, winner selection, dashboards |
| **File Service** | 8085 | MinIO-based file upload/download/delete |
| **Interaction Service** | 8086 | Voting, commenting on submissions |

---

## Features

### Authentication & Authorization
- JWT-based registration and login
- OAuth 2.0 login (GitHub, Google)
- Role-based access control: **Admin**, **Organizer**, **Participant**, **Judge**
- Profile management with avatar upload

### Competition Lifecycle
- Full CRUD for competitions with lifecycle states: `UPCOMING` → `ONGOING` → `COMPLETED` → `AWARDED`
- Participation modes: **Individual** or **Team**
- Media uploads (intro videos, promotional images)
- Public / private visibility control

### Submissions & Judging
- Multi-format submission uploads (PDF, ZIP, images)
- Multi-judge assignment and independent scoring
- Score aggregation and automated winner selection
- Public voting and commenting on approved submissions

### Team Management
- Create, join, leave, and disband teams
- Leader-managed member controls
- Team-based competition registration

### Notifications
- Asynchronous event messaging via RabbitMQ
- Email notifications for registration, deregistration, and submission events

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Java 23, Spring Boot 3.4, Spring Cloud 2024, MyBatis-Plus, OpenFeign |
| **Frontend** | React 19, Vite 8, MUI 6, Tailwind CSS 4, React Router 6, Framer Motion |
| **Auth** | JWT (Hutool), Redis, OAuth 2.0 (GitHub, Google) |
| **Gateway** | Spring Cloud Gateway |
| **Database** | MySQL 8.0 |
| **Cache** | Redis 7 |
| **Messaging** | RabbitMQ |
| **Storage** | MinIO (S3-compatible) |
| **Discovery** | Nacos |
| **API Docs** | Knife4j / SpringDoc OpenAPI 3.0 |
| **CI/CD** | Docker Compose, Jenkins |
| **Testing** | JUnit 5, Mockito, Jest, Playwright |

---

## Project Structure

```
project-contest-platform/
├── backend/
│   ├── api-gateway/              # Request routing + JWT filter
│   ├── common-lib/               # Shared DTOs, exceptions, utilities
│   ├── user-service/             # Users, roles, OAuth, teams
│   ├── competition-service/      # Competition management
│   ├── registration-service/     # Registrations + submissions
│   ├── judge-service/            # Scoring + winner selection
│   ├── file-service/             # MinIO file operations
│   ├── interaction-service/      # Votes + comments
│   └── coverage-report/          # JaCoCo aggregated coverage
├── frontend/
│   ├── src/
│   │   ├── theme/                # MUI design tokens + theme
│   │   ├── layouts/              # DashboardLayout, PublicLayout
│   │   ├── services/             # API service modules
│   │   ├── shared/components/    # ErrorBoundary, Toast, EmptyState
│   │   ├── context/              # AuthContext
│   │   ├── Admin/                # Admin pages
│   │   ├── Organizer/            # Organizer pages
│   │   ├── Participant/          # Participant pages
│   │   ├── PublicUser/           # Public pages
│   │   └── Homepages/            # Landing + auth pages
│   └── vite.config.js
├── mysql-init/                   # Database schema auto-init
├── docker-compose.yml
└── pom.xml                       # Maven parent POM
```

---

## Database Schema

Core tables organized by domain:

| Domain | Tables |
|--------|--------|
| **Users** | `users`, `roles`, `user_roles` |
| **Competitions** | `competitions`, `competition_participants`, `competition_organizers`, `competition_teams`, `competition_judges` |
| **Teams** | `team`, `team_members` |
| **Submissions** | `submission_records`, `submission_comments`, `submission_votes`, `submission_winners` |
| **Judging** | `submission_judges`, `submission_judge_scores` |

> Schema is auto-created from `mysql-init/create_table.sql` on first startup.

---

## API Docs

Interactive API documentation is available via Knife4j (Swagger UI):

```
http://localhost:8080/doc.html
```

All endpoints are organized by service with request/response examples.

---

## CI/CD

Jenkins is included in the Docker Compose stack for automated builds:

```bash
docker-compose up -d jenkins
```

- **Dashboard:** http://localhost:8888
- **Initial password:** `docker logs -f jenkins`
- Supports automated build, test, and deploy on every push

---

## Development

### Backend

```bash
./mvnw clean install                              # Build all modules
./mvnw test                                       # Run all tests
./mvnw test -pl backend/user-service              # Test single module
./mvnw test -pl backend/user-service -Dtest=JwtUtilTest  # Single test class
```

### Frontend

```bash
cd frontend
npm install
npm run dev                                       # Dev server on :3000
npm test                                          # Jest tests
npm run build                                     # Production build
```

---

## License

```
MIT License

Copyright (c) 2025 Questora Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
