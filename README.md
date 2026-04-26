# CloudOps Job Hunter

A full-stack web app that aggregates Cloud Infrastructure / DevOps / SRE / Platform
Engineer postings from the last 24–48 hours and (in later phases) tailors a resume
to a selected job description with Claude.

> **Status:** Phases 1–4 are implemented — multi-source job aggregation,
> browsing UI, JWT auth, server-side saved jobs, resume parsing,
> Claude-powered tailoring with diff view + ATS score, cover-letter
> generation, email alerts (instant + daily digest), and an applications
> tracker with per-resume A/B response-rate stats.

---

## Architecture

```
┌────────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────┐
│  React UI  │ ───▶│  Express   │ ───▶│  Postgres   │     │  Redis   │
│  (Vite)    │     │  REST API  │     │  (jobs DB)  │     │ (BullMQ) │
└────────────┘     └─────┬──────┘     └─────────────┘     └────┬─────┘
                         │                                      │
                         ▼                                      ▼
                  ┌──────────────┐                       ┌────────────┐
                  │  /api/jobs   │                       │  Worker    │
                  │  /api/health │                       │ (scrapers) │
                  └──────────────┘                       └─────┬──────┘
                                                               │
                                          ┌────────────────────┴──────────┐
                                          ▼                               ▼
                                ┌────────────────┐              ┌──────────────────┐
                                │  JSearch (P1)  │              │  Indeed/Adzuna/  │
                                │  via RapidAPI  │              │  Greenhouse/...  │
                                └────────────────┘              │  (P2 — pluggable)│
                                                                └──────────────────┘
```

- **Frontend:** React 18 + Vite + TailwindCSS, lucide-react icons.
- **Backend:** Node.js 20 + Express, `pg` for Postgres, BullMQ + ioredis for jobs.
- **Worker:** BullMQ worker that runs every `SCRAPE_INTERVAL_MINUTES` (default 3h)
  and on boot. Each job source is a pluggable `(filters) => Job[]` function in
  `backend/src/scrapers/`.
- **AI:** Anthropic Claude SDK (model `claude-sonnet-4-5`) — wired in for Phase 3.

---

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# (optional) drop your RAPIDAPI_KEY into .env to fetch real jobs
docker compose up --build
```

Services:
- Web UI:  http://localhost:5173
- API:     http://localhost:4000/api/health
- Postgres: localhost:5432 (user/pass `cloudops`/`cloudops`)
- Redis:   localhost:6379

To populate the DB with sample data so the UI renders without API keys:

```bash
docker compose exec api node src/db/seed.js
```

## Quick start (local, no Docker)

```bash
# 1. Postgres + Redis (use Docker for these even if running app locally)
docker compose up -d db redis

# 2. Backend
cd backend
cp ../.env.example ../.env
npm install
npm run migrate
npm run seed       # optional sample data
npm run dev        # API on :4000
npm run worker     # in a second terminal — kicks off scraping

# 3. Frontend
cd ../frontend
npm install
npm run dev        # http://localhost:5173
```

---

## API

| Method | Path                       | Notes                                                                                            |
|-------:|----------------------------|--------------------------------------------------------------------------------------------------|
| GET    | `/api/health`              | API + DB liveness                                                                                |
| GET    | `/api/jobs`                | List jobs. Query: `hours, remote, techStack, experience, salaryMin, search, sort, limit, offset` |
| GET    | `/api/jobs/:id`            | Job detail                                                                                       |
| GET    | `/api/jobs/meta/tech-stack`| Available tech-stack tags for the filter UI                                                      |
| POST   | `/api/jobs/refresh`        | Enqueue a one-off scrape job. Body: `{ "source": "all" \| "jsearch" \| "remoteok" \| ... }`      |
| POST   | `/api/auth/register`       | `{ email, password }` → `{ user, token }`                                                        |
| POST   | `/api/auth/login`          | `{ email, password }` → `{ user, token }`                                                        |
| GET    | `/api/auth/me`             | Current user (auth required)                                                                     |
| GET    | `/api/saved-jobs`          | List saved jobs (auth required)                                                                  |
| GET    | `/api/saved-jobs/ids`      | List saved job IDs (auth required)                                                               |
| POST   | `/api/saved-jobs/:jobId`   | Save (auth required)                                                                             |
| DELETE | `/api/saved-jobs/:jobId`   | Unsave (auth required)                                                                           |
| GET    | `/api/resumes`             | List the user's resumes (auth required)                                                          |
| POST   | `/api/resumes`             | Upload (multipart `file` PDF/DOCX) or paste (`{name, text, isBase}`); parsed to JSON             |
| GET    | `/api/resumes/:id`         | Resume detail with parsed JSON (auth required)                                                   |
| PATCH  | `/api/resumes/:id`         | Edit name / content / `is_base` (auth required)                                                  |
| DELETE | `/api/resumes/:id`         | Delete (auth required)                                                                           |
| POST   | `/api/tailor`              | Tailor resume to a job. Body: `{baseResumeId, jobId \| jobDescription, ...}` (auth + AI key)     |
| POST   | `/api/tailor/score`        | ATS keyword-match score only (no Claude call)                                                    |
| POST   | `/api/tailor/cover-letter` | Generate a cover letter from the same payload                                                    |
| GET    | `/api/tailor/saved`        | List saved tailored resumes                                                                      |
| GET    | `/api/tailor/saved/:id`    | Saved tailored resume detail                                                                     |
| GET    | `/api/alerts`              | List alerts (auth required)                                                                      |
| POST   | `/api/alerts`              | Create alert. Body: `{name, keywords?, techStack?, remoteOnly?, salaryMin?, experience?, delivery?}` |
| PATCH  | `/api/alerts/:id`          | Update an alert (toggle delivery / enabled, edit criteria)                                       |
| DELETE | `/api/alerts/:id`          | Delete an alert                                                                                  |
| GET    | `/api/applications`        | List applications with joined job + resume metadata                                              |
| GET    | `/api/applications/stats`  | Per-tailored-resume response-rate stats for A/B testing                                          |
| POST   | `/api/applications`        | Log a new application                                                                            |
| PATCH  | `/api/applications/:id`    | Update status / notes / responded-at                                                             |
| DELETE | `/api/applications/:id`    | Delete an application                                                                            |

Example:

```bash
curl 'http://localhost:4000/api/jobs?hours=24&remote=true&techStack=AWS,Kubernetes&sort=salary'
```

---

## Required API keys

| Key                   | Where                                                    | Used for                       |
|-----------------------|----------------------------------------------------------|--------------------------------|
| `RAPIDAPI_KEY`        | https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch   | JSearch (LinkedIn/Indeed/etc.) |
| `ADZUNA_APP_ID`/`KEY` | https://developer.adzuna.com/                            | Adzuna (Phase 2)               |
| `ANTHROPIC_API_KEY`   | https://console.anthropic.com/                           | Resume tailoring (Phase 3)     |

The app gracefully no-ops sources whose keys are missing, so you can run with
just one provider — or with no providers using `npm run seed`.

---

## Adding a new job source

1. Create `backend/src/scrapers/<source>.js` exporting an
   `async function fetch<Source>Jobs({ hours, remoteOnly })` that returns an
   array of normalized job objects (see `jsearch.js` for the shape — pay
   attention to `dedupe_hash` and `tech_stack_tags`).
2. Register it in `backend/src/workers/index.js` under `SCRAPERS`.
3. Schedule it in `backend/src/workers/queue.js` (or trigger ad-hoc via
   `POST /api/jobs/refresh`).

The DB layer (`upsertJobs`) is source-agnostic — every job is upserted by
`(source, source_id)` with a secondary unique constraint on `dedupe_hash`
so duplicates across sources collapse to one record.

See `docs/extending-sources.md` for a worked example.

---

## Roadmap

- **Phase 1 (done):** JSearch source, jobs API, browsing UI with filters & detail drawer.
- **Phase 2 (done):** JWT auth (register/login/me), server-side saved jobs,
  five additional sources — RemoteOK, Adzuna, Greenhouse public boards,
  Lever public boards, HN "Who is hiring" parser.
- **Phase 3 (done):** Resume tailoring tab — PDF/DOCX/text parsing to
  structured JSON, Claude-powered tailoring with adaptive thinking, prompt
  caching on the system prompt, side-by-side diff with `diffWords`,
  ATS keyword-match score with missing-keyword report, cover-letter
  generator, and PDF / DOCX / TXT / clipboard export from the browser.
- **Phase 4 (done):** Email alerts with criteria (keywords, tech stack,
  remote, salary, experience) and per-alert delivery (`instant`, `digest`,
  `both`, `off`). Instant alerts fire after each scrape; digests run on a
  configurable cron (`DIGEST_CRON`, default 14:00 UTC). Nodemailer
  transport with a stdout fallback for local dev. Applications tracker
  with status pipeline and per-tailored-resume A/B response-rate stats.

---

## Compliance note

This project queries third-party job-board APIs and aggregators. Always
verify each provider's Terms of Service before scraping or deploying widely.
The bundled JSearch integration uses the official RapidAPI endpoint — no
direct site scraping is performed. Sanitize and respect `robots.txt` on any
custom source you add.
