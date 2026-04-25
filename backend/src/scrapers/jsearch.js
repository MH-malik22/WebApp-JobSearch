import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { env } from '../config/env.js';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';

const SEARCH_QUERIES = [
  'Cloud Infrastructure Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Platform Engineer',
  'Cloud Engineer',
  'Infrastructure Engineer',
];

// JSearch supports `date_posted` = today | 3days | week | month | all
function dateFilterFor(hours = 48) {
  if (hours <= 24) return 'today';
  if (hours <= 72) return '3days';
  return 'week';
}

function normalizeJob(j) {
  const title = j.job_title ?? '';
  const company = j.employer_name ?? 'Unknown';
  const location =
    [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || null;
  const description = sanitizeHtml(j.job_description ?? '', {
    allowedTags: [],
    allowedAttributes: {},
  });

  return {
    source: 'jsearch',
    source_id: j.job_id,
    dedupe_hash: dedupeHash({ title, company, location }),
    title,
    company,
    company_logo: j.employer_logo ?? null,
    location,
    is_remote: Boolean(j.job_is_remote),
    posted_at: j.job_posted_at_datetime_utc
      ? new Date(j.job_posted_at_datetime_utc)
      : null,
    salary_min: j.job_min_salary ?? null,
    salary_max: j.job_max_salary ?? null,
    salary_currency: j.job_salary_currency ?? null,
    description,
    apply_url: j.job_apply_link ?? j.job_google_link ?? '',
    experience: j.job_required_experience?.required_experience_in_months
      ? `${Math.round(j.job_required_experience.required_experience_in_months / 12)}+ yrs`
      : null,
    tech_stack_tags: detectTechStack(`${title}\n${description}`),
    raw: j,
  };
}

export async function fetchJSearchJobs({ hours = 48, remoteOnly = false } = {}) {
  if (!env.rapidApiKey) {
    console.warn('[jsearch] RAPIDAPI_KEY not set; skipping live fetch');
    return [];
  }
  const datePosted = dateFilterFor(hours);
  const all = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const { data } = await axios.get(`https://${env.rapidApiHost}/search`, {
        timeout: 15_000,
        params: {
          query,
          page: 1,
          num_pages: 1,
          date_posted: datePosted,
          remote_jobs_only: remoteOnly ? 'true' : 'false',
        },
        headers: {
          'X-RapidAPI-Key': env.rapidApiKey,
          'X-RapidAPI-Host': env.rapidApiHost,
        },
      });
      if (Array.isArray(data?.data)) {
        for (const item of data.data) all.push(normalizeJob(item));
      }
    } catch (err) {
      console.error(`[jsearch] query failed (${query}):`, err.message);
    }
  }

  // De-duplicate within this batch by dedupe_hash before handing off.
  const seen = new Map();
  for (const job of all) {
    if (!job.title || !job.apply_url) continue;
    if (!seen.has(job.dedupe_hash)) seen.set(job.dedupe_hash, job);
  }
  return [...seen.values()];
}
