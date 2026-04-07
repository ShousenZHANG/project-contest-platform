<!-- Generated: 2026-04-06 | Files scanned: 1 (create_table.sql) | Token estimate: ~800 -->
# Database Schema

Database: `project_contest_platform` (MySQL 8, utf8mb4)
Schema source: `mysql-init/create_table.sql` (auto-init on first Docker start)

## Entity Relationship Diagram

```
users ──1:N──► user_roles ◄──N:1── roles
  │                                  (Admin, Organizer, Participant, Judge)
  │
  ├──1:N──► team (created_by)
  │           └──1:N──► team_members ◄──N:1── users
  │
  ├──1:N──► competition_organizers ◄──N:1──┐
  ├──1:N──► competition_participants ◄─N:1─┤
  ├──1:N──► competition_judges ◄──N:1──────┤
  │                                        │
  │                                   competitions
  │                                        │
  │         competition_teams ◄────N:1─────┘
  │           └──────N:1──► team
  │
  ├──1:N──► submission_records ◄──N:1── competitions
  │           │ (user_id for individual, team_id for team)
  │           ├──1:N──► submission_comments (nested via parent_id)
  │           ├──1:N──► submission_votes
  │           ├──1:N──► submission_judges
  │           │           └──1:N──► submission_judge_scores
  │           └──1:N──► submission_winners
  │
  └──reviewed_by in submission_records
```

## Tables

### Identity
| Table | PK | Key Columns |
|-------|-----|------------|
| users | id (UUID) | name, email (unique), password (bcrypt), avatar_url |
| roles | id (auto) | name (enum: Admin/Organizer/Participant/Judge) |
| user_roles | (user_id, role_id) | composite PK, FK cascade |

### Teams
| Table | PK | Key Columns |
|-------|-----|------------|
| team | id (UUID) | name, created_by → users |
| team_members | id (UUID) | team_id, user_id, role (default MEMBER), unique(team_id,user_id) |

### Competitions
| Table | PK | Key Columns |
|-------|-----|------------|
| competitions | id (UUID) | name, category, status, participation_type (INDIVIDUAL/TEAM), scoring_criteria (JSON), allowed_submission_types (JSON), image_urls (JSON) |
| competition_organizers | id (UUID) | competition_id, user_id, unique(comp,user) |
| competition_participants | id (UUID) | competition_id, user_id, unique(comp,user) |
| competition_teams | id (UUID) | competition_id, team_id, unique(comp,team) |
| competition_judges | id (UUID) | competition_id, user_id, unique(comp,user) |

### Submissions
| Table | PK | Key Columns |
|-------|-----|------------|
| submission_records | id (UUID) | competition_id, user_id (individual), team_id (team), title, file_url, review_status (PENDING/APPROVED/REJECTED), total_score, unique(comp,user), unique(comp,team) |
| submission_comments | id (UUID) | submission_id, user_id, parent_id (self-ref for nesting), content |
| submission_votes | id (UUID) | submission_id, user_id, unique(sub,user) |

### Judging
| Table | PK | Key Columns |
|-------|-----|------------|
| submission_judges | id (UUID) | submission_id, competition_id, judge_id, total_score, judge_comments, unique(sub,judge) |
| submission_judge_scores | id (UUID) | judge_record_id → submission_judges, submission_id, criterion, score, weight |
| submission_winners | id (UUID) | competition_id, submission_id, award_name, rank_submission, unique(comp,sub,award) |

## Seed Data
- 4 roles pre-inserted: Admin, Organizer, Participant, Judge
- Default admin: admin@gmail.com (bcrypt password)
