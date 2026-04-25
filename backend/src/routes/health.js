import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  const checks = { api: 'ok', db: 'unknown' };
  try {
    await query('SELECT 1');
    checks.db = 'ok';
  } catch (err) {
    checks.db = `error: ${err.message}`;
  }
  res.json({ status: 'ok', checks, timestamp: new Date().toISOString() });
});

export default router;
