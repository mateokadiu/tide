import 'server-only';
import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/lib/env';

let connection: IORedis | null = null;

export function redis(): IORedis {
  if (connection) return connection;
  connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}

function conn(): ConnectionOptions {
  return { connection: redis() };
}

export const queues = {
  extract: new Queue('extract', conn()),
  embed: new Queue('embed', conn()),
  tag: new Queue('tag', conn()),
  archiveHtml: new Queue('archive-html', conn()),
  weeklyDigest: new Queue('weekly-digest', conn()),
} as const;

export type QueueName = keyof typeof queues;

export interface ExtractJob {
  articleId: string;
  userId: string;
  url: string;
  source: 'web' | 'extension' | 'pwa' | 'email' | 'api';
}
export interface EmbedJob {
  articleId: string;
  userId: string;
}
export interface TagJob {
  articleId: string;
  userId: string;
}
export interface ArchiveHtmlJob {
  articleId: string;
  userId: string;
  url: string;
  html: string;
}
