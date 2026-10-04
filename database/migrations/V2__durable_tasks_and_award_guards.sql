-- Additive upgrade for an explicitly baselined pre-migration database.
ALTER TABLE submission_records ADD COLUMN score_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE submission_records ADD COLUMN revision INT NOT NULL DEFAULT 0;
ALTER TABLE submission_judges ADD COLUMN submission_revision INT NOT NULL DEFAULT 0;
ALTER TABLE submission_judges ADD COLUMN score_schema_version INT NOT NULL DEFAULT 0;
ALTER TABLE submission_winners ADD COLUMN total_score DECIMAL(4,2) NULL;

CREATE TABLE competition_award_runs (
    competition_id CHAR(36) NOT NULL PRIMARY KEY,
    awarded_at DATETIME NULL,
    score_version BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Existing awarded competitions stay immutable after upgrading.
INSERT INTO competition_award_runs (competition_id,awarded_at)
SELECT id,COALESCE(updated_at,created_at,UTC_TIMESTAMP()) FROM competitions WHERE status='AWARDED';

CREATE TABLE durable_tasks (
    id CHAR(36) NOT NULL PRIMARY KEY,
    owner VARCHAR(64) NOT NULL,
    kind VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(128) NULL,
    aggregate_version BIGINT NULL,
    payload LONGTEXT NOT NULL,
    state VARCHAR(16) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    available_at DATETIME(6) NOT NULL,
    lease_token CHAR(36) NULL,
    lease_until DATETIME(6) NULL,
    last_error VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_task_poll (owner,state,available_at,lease_until),
    INDEX idx_task_aggregate (owner,aggregate_id,aggregate_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notification_inbox (
    event_id VARCHAR(128) NOT NULL PRIMARY KEY,
    received_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
