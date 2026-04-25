import { query } from '../db/pool.js';

const INSERT_SQL = `
INSERT INTO jobs (
  source, source_id, dedupe_hash, title, company, company_logo,
  location, is_remote, posted_at, salary_min, salary_max, salary_currency,
  description, apply_url, experience, tech_stack_tags, raw
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
)
ON CONFLICT (dedupe_hash) DO UPDATE SET
  posted_at  = EXCLUDED.posted_at,
  apply_url  = EXCLUDED.apply_url,
  scraped_at = NOW()
RETURNING id, (xmax = 0) AS inserted
`;

export async function upsertJobs(jobs) {
  let inserted = 0;
  let updated = 0;
  for (const j of jobs) {
    try {
      const { rows } = await query(INSERT_SQL, [
        j.source,
        j.source_id,
        j.dedupe_hash,
        j.title,
        j.company,
        j.company_logo,
        j.location,
        j.is_remote,
        j.posted_at,
        j.salary_min,
        j.salary_max,
        j.salary_currency,
        j.description,
        j.apply_url,
        j.experience,
        j.tech_stack_tags,
        j.raw ?? null,
      ]);
      if (rows[0]?.inserted) inserted += 1;
      else updated += 1;
    } catch (err) {
      console.error('[upsertJobs] failed for', j.title, '@', j.company, err.message);
    }
  }
  return { inserted, updated, total: jobs.length };
}

export async function listJobs(filters = {}) {
  const {
    hours = 48,
    remote,
    techStack = [],
    experience,
    salaryMin,
    search,
    sort = 'recent',
    limit = 50,
    offset = 0,
  } = filters;

  const where = [`(posted_at IS NULL OR posted_at >= NOW() - ($1::int * INTERVAL '1 hour'))`];
  const params = [hours];

  if (remote === true || remote === false) {
    params.push(remote);
    where.push(`is_remote = $${params.length}`);
  }
  if (Array.isArray(techStack) && techStack.length > 0) {
    params.push(techStack);
    where.push(`tech_stack_tags && $${params.length}::text[]`);
  }
  if (experience) {
    params.push(`%${experience}%`);
    where.push(`(experience ILIKE $${params.length} OR title ILIKE $${params.length})`);
  }
  if (salaryMin) {
    params.push(Number(salaryMin));
    where.push(`(salary_max IS NULL OR salary_max >= $${params.length})`);
  }
  if (search) {
    params.push(search);
    where.push(`
      to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
        @@ plainto_tsquery('english', $${params.length})
    `);
  }

  let orderBy = 'COALESCE(posted_at, scraped_at) DESC';
  if (sort === 'salary') orderBy = 'COALESCE(salary_max, salary_min, 0) DESC NULLS LAST';

  params.push(limit, offset);
  const sql = `
    SELECT id, source, title, company, company_logo, location, is_remote,
           posted_at, salary_min, salary_max, salary_currency,
           description, apply_url, experience, tech_stack_tags, scraped_at
    FROM jobs
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await query(sql, params);
  return rows;
}

export async function getJobById(id) {
  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function countJobsLast(hours = 48) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM jobs
       WHERE posted_at IS NULL OR posted_at >= NOW() - ($1::int * INTERVAL '1 hour')`,
    [hours]
  );
  return rows[0]?.n ?? 0;
}
