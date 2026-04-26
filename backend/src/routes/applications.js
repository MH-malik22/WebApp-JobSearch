import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createApplication,
  deleteApplication,
  listApplications,
  resumeStats,
  updateApplication,
} from '../services/applicationsService.js';

const router = Router();
router.use(requireAuth);

const STATUS = [
  'applied', 'screening', 'interview', 'offer', 'rejected', 'ghosted', 'withdrawn',
];

const createSchema = z.object({
  jobId: z.string().uuid().optional().nullable(),
  tailoredResumeId: z.string().uuid().optional().nullable(),
  baseResumeId: z.string().uuid().optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  applyUrl: z.string().url().max(2000).optional().nullable(),
  status: z.enum(STATUS).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateSchema = z.object({
  status: z.enum(STATUS).optional(),
  notes: z.string().max(5000).optional().nullable(),
  respondedAt: z.string().datetime().optional().nullable(),
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ applications: await listApplications(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    res.json({ stats: await resumeStats(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const application = await createApplication(req.user.id, body);
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const application = await updateApplication(req.user.id, req.params.id, body);
    if (!application) return res.status(404).json({ error: 'not_found' });
    res.json({ application });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteApplication(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
