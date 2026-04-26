import { query } from '../db/pool.js';

export async function createResume(userId, { name, content, isBase = false }) {
  if (isBase) {
    await query('UPDATE resumes SET is_base = false WHERE user_id = $1', [userId]);
  }
  const { rows } = await query(
    `INSERT INTO resumes (user_id, name, content_json, is_base)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, content_json, is_base, created_at`,
    [userId, name, content, isBase]
  );
  return rows[0];
}

export async function listResumes(userId) {
  const { rows } = await query(
    `SELECT id, name, is_base, created_at
       FROM resumes
      WHERE user_id = $1
      ORDER BY is_base DESC, created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getResume(userId, resumeId) {
  const { rows } = await query(
    `SELECT id, name, content_json, is_base, created_at
       FROM resumes
      WHERE id = $1 AND user_id = $2`,
    [resumeId, userId]
  );
  return rows[0] ?? null;
}

export async function updateResume(userId, resumeId, { name, content, isBase }) {
  if (isBase === true) {
    await query('UPDATE resumes SET is_base = false WHERE user_id = $1', [userId]);
  }
  const { rows } = await query(
    `UPDATE resumes
        SET name         = COALESCE($3, name),
            content_json = COALESCE($4, content_json),
            is_base      = COALESCE($5, is_base)
      WHERE id = $1 AND user_id = $2
  RETURNING id, name, content_json, is_base, created_at`,
    [resumeId, userId, name ?? null, content ?? null, isBase ?? null]
  );
  return rows[0] ?? null;
}

export async function deleteResume(userId, resumeId) {
  await query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [
    resumeId,
    userId,
  ]);
}

export async function saveTailoredResume(userId, payload) {
  const {
    baseResumeId,
    jobId = null,
    label = null,
    content,
    matchScore = null,
    missingKeywords = [],
    coverLetter = null,
  } = payload;

  const { rows } = await query(
    `INSERT INTO tailored_resumes
       (user_id, base_resume_id, job_id, label, content_json,
        match_score, missing_keywords, cover_letter)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, label, match_score, missing_keywords, created_at`,
    [
      userId,
      baseResumeId,
      jobId,
      label,
      content,
      matchScore,
      missingKeywords,
      coverLetter,
    ]
  );
  return rows[0];
}

export async function listTailoredResumes(userId) {
  const { rows } = await query(
    `SELECT id, base_resume_id, job_id, label, match_score,
            missing_keywords, created_at
       FROM tailored_resumes
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getTailoredResume(userId, id) {
  const { rows } = await query(
    `SELECT id, base_resume_id, job_id, label, content_json,
            match_score, missing_keywords, cover_letter, created_at
       FROM tailored_resumes
      WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}
