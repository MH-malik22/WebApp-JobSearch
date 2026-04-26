import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';

const TARGET = /(devops|sre|site reliability|cloud|platform|infrastructure)/i;

export async function fetchRemoteOkJobs({ hours = 48 } = {}) {
  try {
    const { data } = await axios.get('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CloudOpsJobHunter/0.1 (+https://example.com)' },
      timeout: 15_000,
    });
    if (!Array.isArray(data)) return [];

    const cutoff = Date.now() - hours * 3600 * 1000;
    return data
      .slice(1) // first item is API metadata
      .filter((j) => j && TARGET.test(j.position || ''))
      .filter((j) => !j.date || new Date(j.date).getTime() >= cutoff)
      .map((j) => {
        const description = sanitizeHtml(j.description || '', {
          allowedTags: [],
          allowedAttributes: {},
        });
        const title = j.position || '';
        const company = j.company || 'Unknown';
        return {
          source: 'remoteok',
          source_id: String(j.id),
          dedupe_hash: dedupeHash({ title, company, location: 'Remote' }),
          title,
          company,
          company_logo: j.company_logo || null,
          location: 'Remote',
          is_remote: true,
          posted_at: j.date ? new Date(j.date) : null,
          salary_min: j.salary_min || null,
          salary_max: j.salary_max || null,
          salary_currency: 'USD',
          description,
          apply_url: j.apply_url || j.url || '',
          experience: null,
          tech_stack_tags: detectTechStack(`${title}\n${description}`),
          raw: j,
        };
      })
      .filter((j) => j.apply_url);
  } catch (err) {
    console.error('[remoteok] fetch failed:', err.message);
    return [];
  }
}
