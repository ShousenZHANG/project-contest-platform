<!-- Generated: 2026-04-06 | Files scanned: 120+ | Token estimate: ~900 -->
# Architecture Overview

## System Diagram

```
                        ┌──────────────┐
                        │   Frontend   │ React 19 (CRA) :3000
                        └──────┬───────┘
                               │ HTTP (axios)
                        ┌──────▼───────┐
                        │ API Gateway  │ Spring Cloud Gateway :8080
                        │  JwtAuthFilter│ JWT validation, CORS, routing
                        └──────┬───────┘
                               │ Nacos service discovery + load balancing
          ┌────────────┬───────┼───────┬────────────┬──────────────┐
          ▼            ▼       ▼       ▼            ▼              ▼
    ┌──────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
    │  user    │ │ competi-│ │regis-│ │  judge   │ │  file    │ │interact-│
    │ service  │ │  tion   │ │trat- │ │ service  │ │ service  │ │  ion    │
    │  :8081   │ │ service │ │ion   │ │  :8084   │ │  :8085   │ │ service │
    │          │ │  :8082  │ │:8083 │ │          │ │          │ │  :8086  │
    └────┬─────┘ └───┬─────┘ └──┬───┘ └────┬─────┘ └────┬─────┘ └────┬────┘
         │           │          │           │            │             │
    ┌────▼───────────▼──────────▼───────────▼────────────▼─────────────▼────┐
    │                        MySQL 8 :3306                                  │
    │              database: project_contest_platform                       │
    └──────────────────────────────────────────────────────────────────────-┘
         │           │          │           │            │
    ┌────▼───────────▼──────────▼───────────▼────┐  ┌───▼────┐
    │          Redis :6379 (sessions/cache)       │  │ MinIO  │
    └────────────────────────────────────────────-┘  │:9000   │
         │           │          │           │        └────────┘
    ┌────▼───────────▼──────────▼───────────▼────┐
    │        RabbitMQ :5672 (async events)        │
    └─────────────────────────────────────────────┘
```

## Inter-Service Communication (OpenFeign)

```
competition-service → user-service      (resolve user by email/ID)
competition-service → file-service      (upload promo media)
registration-service → user-service     (resolve participants)
registration-service → file-service     (upload submissions)
registration-service → competition-service (check competition status/organizer)
judge-service → user-service            (resolve judges)
judge-service → registration-service    (get submissions)
judge-service → competition-service     (get competition details/status)
judge-service → interaction-service     (get interaction stats)
interaction-service → user-service      (resolve commenters)
interaction-service → registration-service (validate submission exists)
user-service → registration-service     (check team submissions before delete)
user-service → file-service             (avatar upload)
user-service → github/google APIs       (OAuth flow via external Feign clients)
```

## RabbitMQ Event Flows

```
competition.topic exchange:
  competition-service  ──judge.assigned──►  user-service (email notification)
  competition-service  ──judge.removed───►  user-service (email notification)

registration.topic exchange:
  registration-service ──register.success──────► user-service (email)
  registration-service ──register.removed──────► user-service (email)
  registration-service ──submission.uploaded────► user-service (email)
  registration-service ──submission.reviewed───► user-service (email)

judge.topic exchange:
  judge-service ──award.winner──► user-service (email notification)
```

All email notifications are consumed by user-service's event listeners and sent via SMTP (Gmail).

## Auth Flow

```
Client → Gateway (JwtAuthFilter) → validates JWT from Redis
  ├─ public-urls: bypass auth (login, register, OAuth, public endpoints)
  └─ protected: extracts User-ID, User-Role headers → forwards to services
```

## Roles

Admin, Organizer, Participant, Judge (stored in `roles` table, mapped via `user_roles`)
