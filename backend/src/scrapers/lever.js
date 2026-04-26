import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';
import { LEVER_BOARDS } from './companyBoards.js';

const TARGET = /(devops|sre|site reliability|cloud|platform|infrastructure)/i;

async function fetchBoard(token, hours) {
  try {
    const { data } = await axios.get(
      `https://api.lever.co/v0/postings/${token}`,
      { timeout: 15_000, params: { mode: 'json' } }
    );
    const cutoff = Date.now() - hours * 3600 * 1000;
    if (!Array.isArray(data)) return [];

    return data
      .filter((j) => TARGET.test(j.text || ''))
      .filter((j) => !j.createdAt || j.createdAt >= cutoff)
      .map((j) => {
        const desc = [j.descriptionPlain, ...(j.lists?.map((l) => l.text + ' ' + l.content) ?? [])].join('\n');
        const description = sanitizeHtml(desc, {
          allowedTags: [],
          allowedAttributes: {},
        });
        const title = j.text || '';
        const company = token;
        const location = j.categories?.location || null;
        return {
          source: 'lever',
          source_id: j.id,
          dedupe_hash: dedupeHash({ title, company, location }),
          title,
          company,
          company_logo: null,
          location,
          is_remote: /remote/i.test(`${title} ${location ?? ''}`),
          posted_at: j.createdAt ? new Date(j.createdAt) : null,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          description,
          apply_url: j.hostedUrl || j.applyUrl,
          experience: j.categories?.commitment || null,
          tech_stack_tags: detectTechStack(`${title}\n${description}`),
          raw: j,
        };
      });
  } catch (err) {
    console.error(`[lever:${token}] failed:`, err.message);
    return [];
  }
}

export async function fetchLeverJobs({ hours = 48 } = {}) {
  const results = await Promise.all(LEVER_BOARDS.map((t) => fetchBoard(t, hours)));
  return results.flat();
}
