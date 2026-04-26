import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

export const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

export const SCRAPE_QUEUE = 'scrape-jobs';
export const DIGEST_QUEUE = 'send-digests';

export const scrapeQueue = new Queue(SCRAPE_QUEUE, { connection });
export const scrapeEvents = new QueueEvents(SCRAPE_QUEUE, { connection });
export const digestQueue = new Queue(DIGEST_QUEUE, { connection });

export async function scheduleRecurringScrape() {
  const everyMs = env.scrapeIntervalMinutes * 60 * 1000;
  await scrapeQueue.add(
    'all',
    { source: 'all', hours: 48 },
    {
      repeat: { every: everyMs },
      jobId: 'all-sources-recurring',
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
  console.log(`[queue] scheduled all-sources every ${env.scrapeIntervalMinutes}m`);
}

export async function scheduleDailyDigest() {
  await digestQueue.add(
    'daily',
    { kind: 'daily' },
    {
      repeat: { pattern: env.digestCron, tz: 'UTC' },
      jobId: 'daily-digest',
      removeOnComplete: 10,
      removeOnFail: 10,
    }
  );
  console.log(`[queue] scheduled daily digest at "${env.digestCron}" UTC`);
}

export async function enqueueOnce(source = 'all', hours = 48) {
  return scrapeQueue.add(
    source,
    { source, hours },
    { removeOnComplete: 20, removeOnFail: 20 }
  );
}

export async function enqueueDigestNow() {
  return digestQueue.add('manual', { kind: 'manual' });
}
