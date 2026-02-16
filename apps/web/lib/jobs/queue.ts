import 'server-only';
import { Queue, type QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/lib/env';

let connection: IORedis | null = null;

export function redis(): IORedis {
  if (connection) return connection;
  connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}

function opts(): QueueOptions {
  return { connection: redis() };
}

export const queues = {
  extract: new Queue('extract', opts()),
  embed: new Queue('embed', opts()),
  tag: new Queue('tag', opts()),
  archiveHtml: new Queue('archive-html', opts()),
  weeklyDigest: new Queue('weekly-digest', opts()),
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
