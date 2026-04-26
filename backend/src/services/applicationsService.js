import { query } from '../db/pool.js';

export async function listApplications(userId) {
  const { rows } = await query(
    `SELECT a.*,
            j.title  AS job_title,
            j.company AS job_company,
            t.label  AS tailored_label
       FROM applications a
       LEFT JOIN jobs              j ON j.id = a.job_id
       LEFT JOIN tailored_resumes  t ON t.id = a.tailored_resume_id
      WHERE a.user_id = $1
      ORDER BY a.applied_at DESC`,
    [userId]
  );
  return rows;
}

export async function createApplication(userId, payload) {
  const {
    jobId = null,
    tailoredResumeId = null,
    baseResumeId = null,
    company = null,
    title = null,
    applyUrl = null,
    status = 'applied',
    notes = null,
  } = payload;

  const { rows } = await query(
    `INSERT INTO applications
      (user_id, job_id, tailored_resume_id, base_resume_id,
       company, title, apply_url, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      userId,
      jobId,
      tailoredResumeId,
      baseResumeId,
      company,
      title,
      applyUrl,
      status,
      notes,
    ]
  );
  return rows[0];
}

export async function updateApplication(userId, id, payload) {
  const { status, notes, respondedAt } = payload;
  const { rows } = await query(
    `UPDATE applications SET
       status       = COALESCE($3, status),
       notes        = COALESCE($4, notes),
       responded_at = COALESCE($5, responded_at),
       updated_at   = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId, status ?? null, notes ?? null, respondedAt ?? null]
  );
  return rows[0] ?? null;
}

export async function deleteApplication(userId, id) {
  await query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [id, userId]);
}

// Per-tailored-resume aggregate stats so the user can A/B test resume variants.
export async function resumeStats(userId) {
  const { rows } = await query(
    `SELECT
        COALESCE(t.id::text, 'no-tailored')         AS tailored_resume_id,
        COALESCE(t.label, 'No tailored resume')     AS label,
        COUNT(*)                                    AS total,
        SUM(CASE WHEN a.status IN ('screening','interview','offer') THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN a.status = 'interview' THEN 1 ELSE 0 END)                        AS interviews,
        SUM(CASE WHEN a.status = 'offer'     THEN 1 ELSE 0 END)                        AS offers,
        SUM(CASE WHEN a.status = 'rejected'  THEN 1 ELSE 0 END)                        AS rejections,
        SUM(CASE WHEN a.status = 'ghosted'   THEN 1 ELSE 0 END)                        AS ghosted
       FROM applications a
       LEFT JOIN tailored_resumes t ON t.id = a.tailored_resume_id
      WHERE a.user_id = $1
      GROUP BY t.id, t.label
      ORDER BY total DESC`,
    [userId]
  );
  return rows.map((r) => ({
    tailored_resume_id: r.tailored_resume_id,
    label: r.label,
    total: Number(r.total),
    positive: Number(r.positive),
    interviews: Number(r.interviews),
    offers: Number(r.offers),
    rejections: Number(r.rejections),
    ghosted: Number(r.ghosted),
    response_rate:
      Number(r.total) > 0
        ? Math.round((Number(r.positive) / Number(r.total)) * 100)
        : 0,
  }));
}
