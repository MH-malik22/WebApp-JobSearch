import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';
import { GREENHOUSE_BOARDS } from './companyBoards.js';

const TARGET = /(devops|sre|site reliability|cloud|platform|infrastructure)/i;

async function fetchBoard(token, hours) {
  try {
    const { data } = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`,
      { timeout: 15_000, params: { content: 'true' } }
    );
    const cutoff = Date.now() - hours * 3600 * 1000;
    const jobs = data?.jobs ?? [];

    return jobs
      .filter((j) => TARGET.test(j.title || ''))
      .filter((j) => !j.updated_at || new Date(j.updated_at).getTime() >= cutoff)
      .map((j) => {
        const description = sanitizeHtml(j.content || '', {
          allowedTags: [],
          allowedAttributes: {},
        });
        const title = j.title || '';
        const company = token;
        const location = j.location?.name || null;
        return {
          source: 'greenhouse',
          source_id: `${token}-${j.id}`,
          dedupe_hash: dedupeHash({ title, company, location }),
          title,
          company,
          company_logo: null,
          location,
          is_remote: /remote/i.test(`${title} ${location ?? ''}`),
          posted_at: j.updated_at ? new Date(j.updated_at) : null,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          description,
          apply_url: j.absolute_url,
          experience: null,
          tech_stack_tags: detectTechStack(`${title}\n${description}`),
          raw: j,
        };
      });
  } catch (err) {
    console.error(`[greenhouse:${token}] failed:`, err.message);
    return [];
  }
}

export async function fetchGreenhouseJobs({ hours = 48 } = {}) {
  const results = await Promise.all(
    GREENHOUSE_BOARDS.map((t) => fetchBoard(t, hours))
  );
  return results.flat();
}
