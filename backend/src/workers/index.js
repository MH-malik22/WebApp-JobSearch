import { Worker } from 'bullmq';
import { connection, SCRAPE_QUEUE, scheduleRecurringScrape, enqueueOnce } from './queue.js';
import { fetchJSearchJobs } from '../scrapers/jsearch.js';
import { fetchRemoteOkJobs } from '../scrapers/remoteok.js';
import { fetchAdzunaJobs } from '../scrapers/adzuna.js';
import { fetchGreenhouseJobs } from '../scrapers/greenhouse.js';
import { fetchLeverJobs } from '../scrapers/lever.js';
import { fetchHackerNewsJobs } from '../scrapers/hackernews.js';
import { upsertJobs } from '../services/jobsService.js';
import { env } from '../config/env.js';

export const SCRAPERS = {
  jsearch: fetchJSearchJobs,
  remoteok: fetchRemoteOkJobs,
  adzuna: fetchAdzunaJobs,
  greenhouse: fetchGreenhouseJobs,
  lever: fetchLeverJobs,
  hackernews: fetchHackerNewsJobs,
};

const worker = new Worker(
  SCRAPE_QUEUE,
  async (job) => {
    const { source, hours = 48 } = job.data ?? {};
    if (source === 'all' || !source) {
      const summary = {};
      for (const [name, fn] of Object.entries(SCRAPERS)) {
        console.log(`[worker] running ${name} (last ${hours}h)`);
        const jobs = await fn({ hours });
        summary[name] = await upsertJobs(jobs);
        console.log(
          `[worker] ${name} -> +${summary[name].inserted} new / ~${summary[name].updated} updated`
        );
      }
      return summary;
    }

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
    if (env.scrapeOnBoot) await enqueueOnce('all', 48);
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
