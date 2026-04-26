import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';

const TARGET = /(devops|sre|site reliability|cloud|platform|infrastructure|kubernetes|aws|terraform)/i;

async function findLatestThread() {
  // The "Ask HN: Who is hiring?" thread is posted monthly by user 'whoishiring'.
  const { data } = await axios.get(
    'https://hn.algolia.com/api/v1/search_by_date',
    {
      timeout: 15_000,
      params: {
        author: 'whoishiring',
        tags: 'story',
        query: 'who is hiring',
        hitsPerPage: 5,
      },
    }
  );
  const story = data?.hits?.find((h) =>
    /who is hiring/i.test(h.title || '')
  );
  return story?.objectID ?? null;
}

// Heuristic: extract a likely company name from the first line of the post.
// Common formats: "Acme | DevOps Engineer | Remote | $150k–$200k"
function parseHeader(text) {
  const firstLine = (text || '').split('\n')[0] || '';
  const parts = firstLine.split(/\s*\|\s*/);
  const company = (parts[0] || '').trim() || 'HN poster';
  const title = (parts.find((p) => TARGET.test(p)) || parts[1] || '').trim();
  const remote = /remote/i.test(firstLine);
  const location = parts.find((p) => /remote|onsite|hybrid|us|eu|uk|nyc|sf|bay/i.test(p))?.trim() || null;
  return { company, title, remote, location };
}

export async function fetchHackerNewsJobs({ hours = 48 } = {}) {
  try {
    const storyId = await findLatestThread();
    if (!storyId) return [];

    // Pull recent comments under the thread (Algolia returns up to 1k by default).
    const { data } = await axios.get(
      'https://hn.algolia.com/api/v1/search_by_date',
      {
        timeout: 15_000,
        params: {
          tags: `comment,story_${storyId}`,
          hitsPerPage: 200,
        },
      }
    );

    const cutoff = Math.floor((Date.now() - hours * 3600 * 1000) / 1000);
    const comments = (data?.hits ?? []).filter(
      (c) => c.created_at_i && c.created_at_i >= cutoff
    );

    const out = [];
    for (const c of comments) {
      const text = sanitizeHtml(c.comment_text || '', {
        allowedTags: [],
        allowedAttributes: {},
      });
      if (!TARGET.test(text)) continue;

      const { company, title, remote, location } = parseHeader(text);
      if (!title) continue;

      out.push({
        source: 'hackernews',
        source_id: c.objectID,
        dedupe_hash: dedupeHash({ title, company, location }),
        title,
        company,
        company_logo: null,
        location,
        is_remote: remote,
        posted_at: new Date(c.created_at_i * 1000),
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        description: text,
        apply_url: `https://news.ycombinator.com/item?id=${c.objectID}`,
        experience: null,
        tech_stack_tags: detectTechStack(text),
        raw: c,
      });
    }
    return out;
  } catch (err) {
    console.error('[hackernews] fetch failed:', err.message);
    return [];
  }
}
