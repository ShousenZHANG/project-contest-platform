# 🏆 Project Contest Platform

An enterprise-grade **Competition Management Platform** enabling individuals and teams to create, register, manage, and participate in competitions.  
It supports **multi-judge scoring**, **dynamic participation modes** (individual/team), and is ideal for real-world scenarios such as innovation challenges, hackathons, academic contests, and open competitions.  
Designed with **scalability**, **modularity**, and **high extensibility** to meet complex competition management needs.

---

## 🚀 Quick Start

Follow these steps to quickly set up and run the full platform:

1. **Clone the repository**
   ```bash
   git clone https://github.com/unsw-cse-comp99-3900/capstone-project-2025-t1-25t1-9900-w16a-danish.git
   cd capstone-project-2025-t1-25t1-9900-w16a-danish
   ```

2. **Start infrastructure services**  
   In the project root directory, start database and middleware containers:
   ```bash
   docker-compose -f docker-compose.env.yml up -d
   ```

3. **Start backend microservices**  
   Still in the project root directory, start all backend services:
   ```bash
   docker-compose -f docker-compose.service.yml up -d
   ```

4. **Start frontend**
   Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Manually verify database connection (IMPORTANT!)**

   After all services have started, **use Navicat**, **DataGrip**, or **any MySQL client** to **manually connect** to the database.  
   Open the `project_contest_platform` database and verify the tables are properly initialized.

   > ⚡ **This step is essential.**  
   > If you do not manually connect and verify the database connection at least once,  
   > accessing the frontend or APIs may result in errors like **Internal Server Error: Could not open JDBC Connection for transaction**.

   Example connection information:
   - **Host:** `localhost`
   - **Port:** `3306`
   - **Username:** `root`
   - **Password:** `root`
   - **Database:** `project_contest_platform`

6. **Access the platform**
  - Swagger API Docs: [http://localhost:8080/doc.html#/home](http://localhost:8080/doc.html#/home)
  - Frontend Web App: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Default Admin Account

| Role  | Email               | Password    |
|-------|---------------------|-------------|
| Admin | admin@gmail.com      | TestJwt1234 |

> ⚠️ **Note:**  
> When logging in, you need to select a role (Participant or Organizer).  
> As long as you use the email and password provided above, you will be successfully logged in and redirected to the Admin Homepage.  
> The selected role does not affect the login outcome.

---

## 🌐 Service Management URLs

| Service               | URL                                         | Username | Password |
|-----------------------|---------------------------------------------|----------|----------|
| RabbitMQ Dashboard    | [http://localhost:15672](http://localhost:15672) | guest    | guest    |
| Nacos Console         | [http://localhost:8848/nacos](http://localhost:8848/nacos) | nacos    | nacos    |
| MinIO Console         | [http://localhost:9001](http://localhost:9001) | minio    | minio123 |

---

> **Note:**
> - Database schema is auto-generated — no need to manually import SQL.
> - First-time startup may take a few minutes as containers initialize.

## 🎯 Project Highlights

- 🚀 Fully modular and scalable microservices architecture
- 🛡️ Enterprise-grade authentication and role-based authorization
- ⚡ Asynchronous event-driven design using RabbitMQ
- 🎯 Full multi-judge review, scoring aggregation, and winner selection
- 📦 Centralized file storage with MinIO integration
- 🖥️ Complete frontend-backend separation with React and API Gateway
- 📚 Well-documented APIs with OpenAPI 3.0 (Swagger UI)

---

## 🚀 Features

### 🧑‍💻 User Management
- Secure user registration and login (JWT-based)
- OAuth login integration (GitHub, Google)
- Role-based access control: `Admin`, `Organizer`, `Participant`, `Judge`
- Profile editing and avatar upload (MinIO)

### 🏁 Competition Management
- Create, update, and manage competitions
- Set participation type: `INDIVIDUAL` or `TEAM`
- Upload intro videos and promotional images
- Configure public or private competition visibility
- Manage competition lifecycle with full status control:
    - `UPCOMING`: Competition is announced but not started
    - `ONGOING`: Competition is currently active
    - `COMPLETED`: Submission phase is closed
    - `AWARDED`: Winners have been announced
    - `CANCELED`: Competition has been canceled

### 📝 Registration System
- Individual and Team registration (role-checked)
- Organizer view of registered participants/teams with search & sorting
- Cancel or remove registration with notifications
- Pagination, search, and sort support in all endpoints

### 🧠 Submission & Review System
- Upload submissions (PDF, ZIP, images, etc.)
- Assign multiple judges per submission
- Judges can review, comment, and score independently
- Final results aggregated based on multiple judges’ scores
- Public voting and commenting available for approved submissions

### 👥 Team System
- Create, update, delete, or disband teams
- Join/leave team requests
- Manage team members (leader-exclusive)
- Browse, search, and paginate all teams

### 📦 File Storage System
- Centralized file storage using **MinIO**
- Supports avatars, videos, and submission files
- Unified file-service APIs for upload/download/delete
### 📡 Notification System
- Asynchronous event messaging via **RabbitMQ**
- Email notifications for registration, deregistration, and submission updates

---
## 📚 User Guide

### Registration and Login
- New users can register via email/password or sign in using GitHub/Google OAuth.
- Admin can log in using the provided default credentials.
- During admin login, the system allows selecting any available role to access the corresponding management interface.
- Simply enter the admin email and password to proceed.

### Competition Management
- Organizers can create and configure competitions, setting participation type and uploading promotional materials.

### Registration for Competitions
- Participants or teams can register for competitions through the registration page.
- Organizers can approve or remove participants as needed.

### Submission and Review
- Participants can upload their submissions before the competition deadline.
- Judges review assigned submissions, score independently, and provide feedback.
- Winners are automatically calculated based on aggregated scores.

### Team Management
- Users can create teams, invite members, manage membership, and participate in team-based competitions.

---

## 🧱 Microservices Architecture

```text
api-gateway
│
├── user-service           # User management, roles, OAuth login, team management
├── competition-service    # Competition creation, updates, and organizer controls
├── registration-service   # Individual and team registrations, and submission management
├── judge-service          # Judge assignment, submission reviews, and scoring workflows
├── file-service           # Centralized file storage service using MinIO
├── interaction-service    # Public voting and commenting on approved submissions
│
└── coverage-report        # (Internal) Test coverage reports, not a production service
```

---

## 🛠️ Tech Stack

| Layer         | Technology                                          |
|---------------|------------------------------------------------------|
| Backend       | Java 23, Spring Boot 3.x, Spring Cloud, MyBatis-Plus, OpenFeign |
| Auth          | JWT, Redis, OAuth2 (GitHub, Google)                  |
| Gateway       | Spring Cloud Gateway                                |
| Storage       | MinIO (S3-compatible object storage)                |
| Database      | MySQL 8.x                                            |
| Messaging     | RabbitMQ                                             |
| Frontend      | React, React Router, MUI                 |
| DevOps        | Docker, Nacos (service discovery), Swagger (OpenAPI 3.0) |

---

## 📂 Database Structure (Core Tables)

- `users`, `roles`, `user_roles`
- `competitions`, `competition_participants`, `competition_organizers`, `competition_teams`, `competition_judges`
- `team`, `team_members`
- `submission_records`, `submission_comments`, `submission_votes`, `submission_winners`
- `submission_judges`, `submission_judge_scores`

> Supports both **individual** and **team** submissions,  
> with full support for **multi-judge reviews**, **scoring aggregation**, and **winner selection**.  
> Enforces strict validation, constraint integrity, and role-based data access.

---

## 📧 License & Contact

MIT License © 2025
