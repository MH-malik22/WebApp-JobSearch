import { query } from '../db/pool.js';

export async function listAlerts(userId) {
  const { rows } = await query(
    `SELECT id, name, keywords, tech_stack_tags, remote_only, salary_min,
            experience, delivery, enabled, last_sent_at, created_at
       FROM alerts WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createAlert(userId, payload) {
  const {
    name,
    keywords = null,
    techStack = [],
    remoteOnly = false,
    salaryMin = null,
    experience = null,
    delivery = 'digest',
    enabled = true,
  } = payload;
  const { rows } = await query(
    `INSERT INTO alerts
       (user_id, name, keywords, tech_stack_tags, remote_only,
        salary_min, experience, delivery, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [userId, name, keywords, techStack, remoteOnly, salaryMin, experience, delivery, enabled]
  );
  return rows[0];
}

export async function updateAlert(userId, id, payload) {
  const {
    name,
    keywords,
    techStack,
    remoteOnly,
    salaryMin,
    experience,
    delivery,
    enabled,
  } = payload;
  const { rows } = await query(
    `UPDATE alerts SET
       name            = COALESCE($3, name),
       keywords        = COALESCE($4, keywords),
       tech_stack_tags = COALESCE($5, tech_stack_tags),
       remote_only     = COALESCE($6, remote_only),
       salary_min      = COALESCE($7, salary_min),
       experience      = COALESCE($8, experience),
       delivery        = COALESCE($9, delivery),
       enabled         = COALESCE($10, enabled)
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      id,
      userId,
      name ?? null,
      keywords ?? null,
      techStack ?? null,
      remoteOnly ?? null,
      salaryMin ?? null,
      experience ?? null,
      delivery ?? null,
      enabled ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function deleteAlert(userId, id) {
  await query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [id, userId]);
}

// Find jobs matching an alert that have NOT yet been notified through it.
// `sinceHours` bounds how far back we look — keeps the matcher cheap.
export async function findUnnotifiedMatches(alert, { sinceHours = 6 } = {}) {
  const where = [
    `(j.posted_at IS NULL OR j.posted_at >= NOW() - ($2::int * INTERVAL '1 hour'))`,
    `NOT EXISTS (
       SELECT 1 FROM alert_notifications n
        WHERE n.alert_id = $1 AND n.job_id = j.id
     )`,
  ];
  const params = [alert.id, sinceHours];

  if (alert.remote_only) where.push(`j.is_remote = TRUE`);
  if (alert.tech_stack_tags?.length) {
    params.push(alert.tech_stack_tags);
    where.push(`j.tech_stack_tags && $${params.length}::text[]`);
  }
  if (alert.salary_min) {
    params.push(alert.salary_min);
    where.push(`(j.salary_max IS NULL OR j.salary_max >= $${params.length})`);
  }
  if (alert.experience) {
    params.push(`%${alert.experience}%`);
    where.push(`(j.experience ILIKE $${params.length} OR j.title ILIKE $${params.length})`);
  }
  if (alert.keywords) {
    params.push(alert.keywords);
    where.push(`
      to_tsvector('english', coalesce(j.title,'') || ' ' || coalesce(j.description,''))
        @@ plainto_tsquery('english', $${params.length})
    `);
  }

  const sql = `
    SELECT j.*
      FROM jobs j
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(j.posted_at, j.scraped_at) DESC
     LIMIT 50
  `;
  const { rows } = await query(sql, params);
  return rows;
}

export async function recordNotifications(alertId, jobIds) {
  if (jobIds.length === 0) return;
  const values = jobIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await query(
    `INSERT INTO alert_notifications (alert_id, job_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [alertId, ...jobIds]
  );
  await query('UPDATE alerts SET last_sent_at = NOW() WHERE id = $1', [alertId]);
}

export async function listEnabledAlertsWithUsers(deliveryFilter = null) {
  const where = ['a.enabled = TRUE'];
  const params = [];
  if (deliveryFilter) {
    params.push(deliveryFilter);
    where.push(`a.delivery IN ($${params.length}, 'both')`);
  }
  const { rows } = await query(
    `SELECT a.*, u.email AS user_email
       FROM alerts a
       JOIN users u ON u.id = a.user_id
      WHERE ${where.join(' AND ')}`,
    params
  );
  return rows;
}
