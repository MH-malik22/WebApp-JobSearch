import pino from 'pino';
import { env } from './env.js';

// In dev we use pretty output; in prod we emit structured JSON for ingestion
// by Loki/Datadog/etc. Pretty mode requires `pino-pretty` to be installed —
// we fall back to JSON if it isn't.
function buildLogger() {
  const base = {
    level: process.env.LOG_LEVEL ?? (env.nodeEnv === 'production' ? 'info' : 'debug'),
    base: { service: 'cloudops-job-hunter' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.password_hash',
        '*.token',
        '*.api_key',
      ],
      censor: '[REDACTED]',
    },
  };
  if (env.nodeEnv === 'production') return pino(base);
  try {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', singleLine: false },
      },
    });
  } catch {
    return pino(base);
  }
}

export const logger = buildLogger();
