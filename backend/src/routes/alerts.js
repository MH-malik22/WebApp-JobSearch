import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createAlert,
  deleteAlert,
  listAlerts,
  updateAlert,
} from '../services/alertsService.js';

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  name: z.string().min(1).max(120),
  keywords: z.string().max(500).optional().nullable(),
  techStack: z.array(z.string()).optional(),
  remoteOnly: z.boolean().optional(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  experience: z.string().max(40).optional().nullable(),
  delivery: z.enum(['instant', 'digest', 'both', 'off']).optional(),
  enabled: z.boolean().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ alerts: await listAlerts(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = baseSchema.parse(req.body);
    const alert = await createAlert(req.user.id, body);
    res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = baseSchema.partial().parse(req.body);
    const alert = await updateAlert(req.user.id, req.params.id, body);
    if (!alert) return res.status(404).json({ error: 'not_found' });
    res.json({ alert });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteAlert(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
