import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { env } from '../config/env.js';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';

const QUERIES = [
  'cloud infrastructure engineer',
  'devops engineer',
  'site reliability engineer',
  'platform engineer',
];

export async function fetchAdzunaJobs({ hours = 48, country = 'us' } = {}) {
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    console.warn('[adzuna] credentials missing; skipping');
    return [];
  }
  const maxDaysOld = Math.max(1, Math.ceil(hours / 24));
  const out = [];

  for (const q of QUERIES) {
    try {
      const { data } = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
        {
          timeout: 15_000,
          params: {
            app_id: env.adzunaAppId,
            app_key: env.adzunaAppKey,
            results_per_page: 50,
            what: q,
            max_days_old: maxDaysOld,
            content_type: 'application/json',
          },
        }
      );
      for (const j of data?.results ?? []) {
        const description = sanitizeHtml(j.description || '', {
          allowedTags: [],
          allowedAttributes: {},
        });
        const title = j.title || '';
        const company = j.company?.display_name || 'Unknown';
        const location = j.location?.display_name || null;
        out.push({
          source: 'adzuna',
          source_id: String(j.id),
          dedupe_hash: dedupeHash({ title, company, location }),
          title,
          company,
          company_logo: null,
          location,
          is_remote: /remote/i.test(`${title} ${location}`),
          posted_at: j.created ? new Date(j.created) : null,
          salary_min: j.salary_min ? Math.round(j.salary_min) : null,
          salary_max: j.salary_max ? Math.round(j.salary_max) : null,
          salary_currency: country === 'us' ? 'USD' : null,
          description,
          apply_url: j.redirect_url,
          experience: null,
          tech_stack_tags: detectTechStack(`${title}\n${description}`),
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[adzuna] query "${q}" failed:`, err.message);
    }
  }
  return out;
}
