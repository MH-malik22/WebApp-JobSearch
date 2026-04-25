# Adding a new job source

Each source is a single file under `backend/src/scrapers/` exporting an
`async` function that returns normalized jobs. Keep them small and dumb —
network in, plain objects out. All persistence and de-duplication is handled
by `services/jobsService.js`.

## 1. The shape

A normalized job looks like:

```js
{
  source:          'remoteok',                  // free-form, your choice
  source_id:       '12345',                     // stable id from the source
  dedupe_hash:     dedupeHash({ title, company, location }),
  title:           'DevOps Engineer',
  company:         'Acme',
  company_logo:    'https://…/logo.png',        // optional
  location:        'Remote',                    // optional
  is_remote:       true,
  posted_at:       new Date(...),               // optional
  salary_min:      120000,                      // optional
  salary_max:      150000,                      // optional
  salary_currency: 'USD',                       // optional
  description:     '<sanitized html-stripped text>',
  apply_url:       'https://…',
  experience:      'Senior',                    // optional, free-form
  tech_stack_tags: detectTechStack(text),       // string[]
  raw:             original,                    // optional, for debugging
}
```

Helpers live in `backend/src/utils/`:

- `dedupeHash({ title, company, location })` — SHA-256 of normalized fields.
- `detectTechStack(text)` — keyword-based tagger over title + description.

Always sanitize HTML descriptions with `sanitize-html` before storing.

## 2. Worked example: RemoteOK

```js
// backend/src/scrapers/remoteok.js
import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';

const TARGET_TITLES = /(devops|sre|cloud|platform|infrastructure)/i;

export async function fetchRemoteOkJobs({ hours = 48 } = {}) {
  const { data } = await axios.get('https://remoteok.com/api', {
    headers: { 'User-Agent': 'CloudOpsJobHunter/0.1' },
    timeout: 15_000,
  });

  // First element is metadata; postings follow.
  const cutoff = Date.now() - hours * 3600 * 1000;
  return data
    .slice(1)
    .filter((j) => TARGET_TITLES.test(j.position || ''))
    .filter((j) => new Date(j.date).getTime() >= cutoff)
    .map((j) => {
      const description = sanitizeHtml(j.description || '', {
        allowedTags: [], allowedAttributes: {},
      });
      return {
        source: 'remoteok',
        source_id: String(j.id),
        dedupe_hash: dedupeHash({
          title: j.position, company: j.company, location: 'Remote',
        }),
        title: j.position,
        company: j.company,
        company_logo: j.company_logo || null,
        location: 'Remote',
        is_remote: true,
        posted_at: new Date(j.date),
        salary_min: j.salary_min || null,
        salary_max: j.salary_max || null,
        salary_currency: 'USD',
        description,
        apply_url: j.url || j.apply_url,
        experience: null,
        tech_stack_tags: detectTechStack(`${j.position}\n${description}`),
        raw: j,
      };
    });
}
```

## 3. Register it

```js
// backend/src/workers/index.js
import { fetchRemoteOkJobs } from '../scrapers/remoteok.js';

const SCRAPERS = {
  jsearch:  fetchJSearchJobs,
  remoteok: fetchRemoteOkJobs,
};
```

Add a scheduled run in `workers/queue.js#scheduleRecurringScrape`, or trigger
once on demand via `POST /api/jobs/refresh` (extend the route to accept a
`source` body field if you want per-source manual triggers).

## 4. Compliance checklist

- [ ] The source has an official, terms-of-service-allowed API. (Prefer that
      over scraping HTML.)
- [ ] You set a real `User-Agent` and respect any documented rate limits.
- [ ] You sanitize description HTML before persisting.
- [ ] `dedupe_hash` is stable across re-runs (no timestamps, no random ids).
- [ ] Errors are caught — a bad source must never take down the worker.
