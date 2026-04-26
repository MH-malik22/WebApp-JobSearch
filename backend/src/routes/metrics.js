import { Router } from 'express';
import { registry } from '../config/metrics.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  } catch (err) {
    next(err);
  }
});

export default router;
