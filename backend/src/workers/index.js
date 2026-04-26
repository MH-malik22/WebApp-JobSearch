import { Worker } from 'bullmq';
import {
  connection,
  SCRAPE_QUEUE,
  DIGEST_QUEUE,
  scheduleRecurringScrape,
  scheduleDailyDigest,
  enqueueOnce,
} from './queue.js';
import { fetchJSearchJobs } from '../scrapers/jsearch.js';
import { fetchRemoteOkJobs } from '../scrapers/remoteok.js';
import { fetchAdzunaJobs } from '../scrapers/adzuna.js';
import { fetchGreenhouseJobs } from '../scrapers/greenhouse.js';
import { fetchLeverJobs } from '../scrapers/lever.js';
import { fetchHackerNewsJobs } from '../scrapers/hackernews.js';
import { upsertJobs } from '../services/jobsService.js';
import {
  dispatchDigests,
  dispatchInstantAlerts,
} from '../services/alertDispatch.js';
import { env } from '../config/env.js';

export const SCRAPERS = {
  jsearch: fetchJSearchJobs,
  remoteok: fetchRemoteOkJobs,
  adzuna: fetchAdzunaJobs,
  greenhouse: fetchGreenhouseJobs,
  lever: fetchLeverJobs,
  hackernews: fetchHackerNewsJobs,
};

const scrapeWorker = new Worker(
  SCRAPE_QUEUE,
  async (job) => {
    const { source, hours = 48 } = job.data ?? {};
    let summary;

    if (source === 'all' || !source) {
      summary = {};
      for (const [name, fn] of Object.entries(SCRAPERS)) {
        console.log(`[worker] running ${name} (last ${hours}h)`);
        const jobs = await fn({ hours });
        summary[name] = await upsertJobs(jobs);
        console.log(
          `[worker] ${name} -> +${summary[name].inserted} new / ~${summary[name].updated} updated`
        );
      }
    } else {
      const fn = SCRAPERS[source];
      if (!fn) throw new Error(`unknown source: ${source}`);
      console.log(`[worker] running ${source} (last ${hours}h)`);
      const jobs = await fn({ hours });
      summary = await upsertJobs(jobs);
      console.log(
        `[worker] ${source} -> +${summary.inserted} new / ~${summary.updated} updated`
      );
    }

    // Dispatch instant alerts after every scrape — keeps alerted-job latency
    // bounded by the scrape interval, with no extra schedule to maintain.
    try {
      const result = await dispatchInstantAlerts({ sinceHours: 6 });
      console.log(
        `[worker] instant alerts: ${result.emails} email(s) across ${result.alerts} alert(s)`
      );
    } catch (err) {
      console.error('[worker] instant alert dispatch failed:', err.message);
    }

    return summary;
  },
  { connection, concurrency: 2 }
);

const digestWorker = new Worker(
  DIGEST_QUEUE,
  async () => {
    const result = await dispatchDigests({ sinceHours: 24 });
    console.log(
      `[digest] sent ${result.emails} digest(s) to ${result.users} user(s)`
    );
    return result;
  },
  { connection, concurrency: 1 }
);

scrapeWorker.on('failed', (job, err) => {
  console.error(`[scrape-worker] job ${job?.id} failed:`, err.message);
});
digestWorker.on('failed', (job, err) => {
  console.error(`[digest-worker] job ${job?.id} failed:`, err.message);
});

(async () => {
  try {
    await scheduleRecurringScrape();
    await scheduleDailyDigest();
    if (env.scrapeOnBoot) await enqueueOnce('all', 48);
    console.log('[worker] ready');
  } catch (err) {
    console.error('[worker] bootstrap failed:', err);
  }
})();

const shutdown = async () => {
  console.log('[worker] shutting down');
  await Promise.all([scrapeWorker.close(), digestWorker.close()]);
  await connection.quit();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
