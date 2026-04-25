import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

export const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

export const SCRAPE_QUEUE = 'scrape-jobs';

export const scrapeQueue = new Queue(SCRAPE_QUEUE, { connection });
export const scrapeEvents = new QueueEvents(SCRAPE_QUEUE, { connection });

export async function scheduleRecurringScrape() {
  const everyMs = env.scrapeIntervalMinutes * 60 * 1000;
  await scrapeQueue.add(
    'jsearch',
    { source: 'jsearch', hours: 48 },
    {
      repeat: { every: everyMs },
      jobId: 'jsearch-recurring',
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
  console.log(`[queue] scheduled jsearch every ${env.scrapeIntervalMinutes}m`);
}

export async function enqueueOnce(source = 'jsearch', hours = 48) {
  return scrapeQueue.add(
    source,
    { source, hours },
    { removeOnComplete: 20, removeOnFail: 20 }
  );
}
