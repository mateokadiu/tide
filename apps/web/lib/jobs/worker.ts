/**
 * BullMQ worker process. Runs alongside the web process (or as a sidecar).
 * Entry: `pnpm worker` (calls `tsx lib/jobs/worker.ts`).
 */
import 'server-only';
import { Worker } from 'bullmq';
import { redis } from './queue';
import { runExtractJob } from './handlers/extract';
import { runEmbedJob } from './handlers/embed';
import { runTagJob } from './handlers/tag';
import { runArchiveHtmlJob } from './handlers/archive-html';
import { runWeeklyDigest } from './handlers/weekly-digest';

const connection = redis();

const workers = [
  new Worker('extract', async (job) => runExtractJob(job.data), { connection, concurrency: 4 }),
  new Worker('embed', async (job) => runEmbedJob(job.data), { connection, concurrency: 6 }),
  new Worker('tag', async (job) => runTagJob(job.data), { connection, concurrency: 4 }),
  new Worker('archive-html', async (job) => runArchiveHtmlJob(job.data), {
    connection,
    concurrency: 4,
  }),
  new Worker('weekly-digest', async (job) => runWeeklyDigest(job.data), {
    connection,
    concurrency: 1,
  }),
];

for (const w of workers) {
  w.on('failed', (job, err) => {
    console.error(`[worker] ${w.name} failed`, job?.id, err?.message);
  });
  w.on('completed', (job) => {
    console.info(`[worker] ${w.name} ok`, job.id);
  });
}

async function shutdown() {
  console.info('[worker] shutting down…');
  await Promise.all(workers.map((w) => w.close()));
  await redis().quit();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.info(`[worker] started; pid=${process.pid}; queues=${workers.map((w) => w.name).join(',')}`);
