import { query } from '../db/pool.js';

export async function saveJob(userId, jobId) {
  await query(
    `INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, jobId]
  );
}

export async function unsaveJob(userId, jobId) {
  await query('DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [
    userId,
    jobId,
  ]);
}

export async function listSavedJobs(userId) {
  const { rows } = await query(
    `SELECT j.id, j.title, j.company, j.company_logo, j.location, j.is_remote,
            j.posted_at, j.salary_min, j.salary_max, j.salary_currency,
            j.description, j.apply_url, j.experience, j.tech_stack_tags,
            j.scraped_at, s.saved_at
       FROM saved_jobs s
       JOIN jobs j ON j.id = s.job_id
      WHERE s.user_id = $1
      ORDER BY s.saved_at DESC`,
    [userId]
  );
  return rows;
}

export async function listSavedJobIds(userId) {
  const { rows } = await query(
    'SELECT job_id FROM saved_jobs WHERE user_id = $1',
    [userId]
  );
  return rows.map((r) => r.job_id);
}
