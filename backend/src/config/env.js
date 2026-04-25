import 'dotenv/config';

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    console.warn(`[env] ${name} is not set; using undefined`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: required(
    'DATABASE_URL',
    'postgres://cloudops:cloudops@localhost:5432/cloudops_jobs'
  ),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
  rapidApiHost: process.env.RAPIDAPI_HOST ?? 'jsearch.p.rapidapi.com',
  adzunaAppId: process.env.ADZUNA_APP_ID ?? '',
  adzunaAppKey: process.env.ADZUNA_APP_KEY ?? '',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',

  scrapeIntervalMinutes: Number(process.env.SCRAPE_INTERVAL_MINUTES ?? 180),
  scrapeOnBoot: (process.env.SCRAPE_ON_BOOT ?? 'true') === 'true',
  useSeedData: (process.env.USE_SEED_DATA ?? 'false') === 'true',
};
