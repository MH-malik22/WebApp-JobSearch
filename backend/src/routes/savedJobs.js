import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listSavedJobIds,
  listSavedJobs,
  saveJob,
  unsaveJob,
} from '../services/savedJobsService.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const jobs = await listSavedJobs(req.user.id);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

router.get('/ids', async (req, res, next) => {
  try {
    const ids = await listSavedJobIds(req.user.id);
    res.json({ ids });
  } catch (err) {
    next(err);
  }
});

router.post('/:jobId', async (req, res, next) => {
  try {
    await saveJob(req.user.id, req.params.jobId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete('/:jobId', async (req, res, next) => {
  try {
    await unsaveJob(req.user.id, req.params.jobId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
