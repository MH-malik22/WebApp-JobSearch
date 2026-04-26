import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { metricsMiddleware } from './config/metrics.js';
import { requestId } from './middleware/requestId.js';
import jobsRouter from './routes/jobs.js';
import healthRouter from './routes/health.js';
import metricsRouter from './routes/metrics.js';
import authRouter from './routes/auth.js';
import savedJobsRouter from './routes/savedJobs.js';
import resumesRouter from './routes/resumes.js';
import tailorRouter from './routes/tailor.js';
import alertsRouter from './routes/alerts.js';
import applicationsRouter from './routes/applications.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
    },
  })
);
app.use(metricsMiddleware);

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/health', healthRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/saved-jobs', savedJobsRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/tailor', tailorRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/applications', applicationsRouter);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  logger.info(`api listening on :${env.port} (${env.nodeEnv})`);
});

const shutdown = (signal) => {
  logger.info(`received ${signal}, shutting down`);
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'shutdown failed');
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
