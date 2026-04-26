import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../db/pool.js';

const router = Router();

const here = dirname(fileURLToPath(import.meta.url));
let _version;
async function getVersion() {
  if (_version) return _version;
  try {
    const pkg = await readFile(join(here, '..', '..', 'package.json'), 'utf8');
    _version = JSON.parse(pkg).version ?? 'unknown';
  } catch {
    _version = 'unknown';
  }
  return _version;
}

async function checkRedis() {
  try {
    const { connection } = await import('../workers/queue.js');
    const pong = await connection.ping();
    return pong === 'PONG' ? 'ok' : `unexpected: ${pong}`;
  } catch (err) {
    return `error: ${err.message}`;
  }
}

router.get('/', async (_req, res) => {
  const checks = { api: 'ok', db: 'unknown', redis: 'unknown' };
  try {
    await query('SELECT 1');
    checks.db = 'ok';
  } catch (err) {
    checks.db = `error: ${err.message}`;
  }
  checks.redis = await checkRedis();

  const allHealthy = Object.values(checks).every((v) => v === 'ok');
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    version: await getVersion(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe — passes as long as the process is up. Use this for k8s
// livenessProbe; use / for readinessProbe (which checks deps).
router.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
