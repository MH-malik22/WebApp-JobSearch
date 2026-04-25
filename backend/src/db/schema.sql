-- CloudOps Job Hunter schema
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  dedupe_hash     TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  company         TEXT NOT NULL,
  company_logo    TEXT,
  location        TEXT,
  is_remote       BOOLEAN NOT NULL DEFAULT FALSE,
  posted_at       TIMESTAMPTZ,
  salary_min      INTEGER,
  salary_max      INTEGER,
  salary_currency TEXT,
  description     TEXT,
  apply_url       TEXT NOT NULL,
  experience      TEXT,
  tech_stack_tags TEXT[] NOT NULL DEFAULT '{}',
  raw             JSONB,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS jobs_posted_at_idx       ON jobs (posted_at DESC);
CREATE INDEX IF NOT EXISTS jobs_company_idx         ON jobs (company);
CREATE INDEX IF NOT EXISTS jobs_tech_stack_gin_idx  ON jobs USING GIN (tech_stack_tags);
CREATE INDEX IF NOT EXISTS jobs_search_idx          ON jobs USING GIN (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
);

CREATE TABLE IF NOT EXISTS resumes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  content_json JSONB NOT NULL,
  is_base      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id    UUID NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  saved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS tailored_resumes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  label          TEXT,
  content_json   JSONB NOT NULL,
  match_score    NUMERIC(5,2),
  missing_keywords TEXT[] NOT NULL DEFAULT '{}',
  cover_letter   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
