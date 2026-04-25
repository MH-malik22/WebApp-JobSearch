import { Worker } from 'bullmq';
import { connection, SCRAPE_QUEUE, scheduleRecurringScrape, enqueueOnce } from './queue.js';
import { fetchJSearchJobs } from '../scrapers/jsearch.js';
import { upsertJobs } from '../services/jobsService.js';
import { env } from '../config/env.js';

const SCRAPERS = {
  jsearch: fetchJSearchJobs,
  // Future: indeed, adzuna, greenhouse, lever, remoteok, ycombinator, hackernews
};

const worker = new Worker(
  SCRAPE_QUEUE,
  async (job) => {
    const { source = 'jsearch', hours = 48 } = job.data ?? {};
    const fn = SCRAPERS[source];
    if (!fn) throw new Error(`unknown source: ${source}`);

    console.log(`[worker] running ${source} (last ${hours}h)`);
    const jobs = await fn({ hours });
    const result = await upsertJobs(jobs);
    console.log(`[worker] ${source} -> +${result.inserted} new / ~${result.updated} updated`);
    return result;
  },
  { connection, concurrency: 2 }
);

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

(async () => {
  try {
    await scheduleRecurringScrape();
    if (env.scrapeOnBoot) await enqueueOnce('jsearch', 48);
    console.log('[worker] ready');
  } catch (err) {
    console.error('[worker] bootstrap failed:', err);
  }
})();

const shutdown = async () => {
  console.log('[worker] shutting down');
  await worker.close();
  await connection.quit();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
