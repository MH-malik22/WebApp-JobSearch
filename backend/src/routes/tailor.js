import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
  getResume,
  saveTailoredResume,
  listTailoredResumes,
  getTailoredResume,
} from '../services/resumeService.js';
import { getJobById } from '../services/jobsService.js';
import {
  tailorResume,
  generateCoverLetter,
} from '../services/aiTailorService.js';
import { atsScore, resumeToText } from '../utils/atsScore.js';

const router = Router();
router.use(requireAuth);

// Tighter limit on AI endpoints — they're expensive.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
});

const tailorBody = z.object({
  baseResumeId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  jobDescription: z.string().min(20).optional(),
  companyName: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  label: z.string().max(120).optional(),
  saveResult: z.boolean().optional(),
});

async function resolveJobContext(userId, body) {
  if (body.jobId) {
    const job = await getJobById(body.jobId);
    if (!job) {
      const err = new Error('job_not_found');
      err.status = 404;
      throw err;
    }
    return {
      jobDescription: job.description ?? '',
      companyName: job.company ?? body.companyName ?? '',
      jobTitle: job.title ?? body.jobTitle ?? '',
    };
  }
  if (!body.jobDescription) {
    const err = new Error('jobDescription or jobId required');
    err.status = 400;
    throw err;
  }
  return {
    jobDescription: body.jobDescription,
    companyName: body.companyName ?? '',
    jobTitle: body.jobTitle ?? '',
  };
}

router.post('/score', async (req, res, next) => {
  try {
    const body = z
      .object({
        baseResumeId: z.string().uuid(),
        jobId: z.string().uuid().optional(),
        jobDescription: z.string().min(20).optional(),
      })
      .parse(req.body);
    const resume = await getResume(req.user.id, body.baseResumeId);
    if (!resume) return res.status(404).json({ error: 'resume_not_found' });
    const ctx = await resolveJobContext(req.user.id, body);
    const result = atsScore(ctx.jobDescription, resumeToText(resume.content_json));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', aiLimiter, async (req, res, next) => {
  try {
    const body = tailorBody.parse(req.body);
    const resume = await getResume(req.user.id, body.baseResumeId);
    if (!resume) return res.status(404).json({ error: 'resume_not_found' });
    const ctx = await resolveJobContext(req.user.id, body);

    const original = resume.content_json;
    const { tailored, usage, model } = await tailorResume({
      resume: original,
      ...ctx,
    });

    const tailoredText = resumeToText({
      ...original,
      ...tailored,
    });
    const score = atsScore(ctx.jobDescription, tailoredText);

    let saved = null;
    if (body.saveResult !== false) {
      saved = await saveTailoredResume(req.user.id, {
        baseResumeId: body.baseResumeId,
        jobId: body.jobId ?? null,
        label: body.label ?? `${ctx.companyName || 'Tailored'} – ${ctx.jobTitle || 'role'}`.slice(0, 120),
        content: tailored,
        matchScore: score.score,
        missingKeywords: score.missing,
      });
    }

    res.json({
      original,
      tailored,
      score,
      saved,
      usage,
      model,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/cover-letter', aiLimiter, async (req, res, next) => {
  try {
    const body = tailorBody.parse(req.body);
    const resume = await getResume(req.user.id, body.baseResumeId);
    if (!resume) return res.status(404).json({ error: 'resume_not_found' });
    const ctx = await resolveJobContext(req.user.id, body);
    const { text, usage, model } = await generateCoverLetter({
      resume: resume.content_json,
      ...ctx,
    });
    res.json({ text, usage, model });
  } catch (err) {
    next(err);
  }
});

router.get('/saved', async (req, res, next) => {
  try {
    res.json({ tailored: await listTailoredResumes(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/saved/:id', async (req, res, next) => {
  try {
    const t = await getTailoredResume(req.user.id, req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json({ tailored: t });
  } catch (err) {
    next(err);
  }
});

export default router;
