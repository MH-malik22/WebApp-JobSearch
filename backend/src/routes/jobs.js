import { Router } from 'express';
import { z } from 'zod';
import { listJobs, getJobById, countJobsLast } from '../services/jobsService.js';
import { TECH_STACK_TAGS } from '../utils/techStack.js';
import { enqueueOnce } from '../workers/queue.js';

const router = Router();

const listQuery = z.object({
  hours: z.coerce.number().int().min(1).max(720).optional(),
  remote: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  techStack: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : [])),
  experience: z.string().optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  search: z.string().optional(),
  sort: z.enum(['recent', 'salary']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const filters = listQuery.parse(req.query);
    const [jobs, total] = await Promise.all([
      listJobs(filters),
      countJobsLast(filters.hours ?? 48),
    ]);
    res.json({ jobs, total, filters });
  } catch (err) {
    next(err);
  }
});

router.get('/meta/tech-stack', (_req, res) => {
  res.json({ tags: TECH_STACK_TAGS });
});

router.post('/refresh', async (_req, res, next) => {
  try {
    const job = await enqueueOnce('jsearch', 48);
    res.status(202).json({ enqueued: true, jobId: job.id });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: 'not_found' });
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

export default router;
