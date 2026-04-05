#!/usr/bin/env node
// Quick load test for POST /api/v1/articles.
//
// Usage:
//   TIDE_URL=http://localhost:3000 TIDE_TOKEN=tide_pat_... node scripts/loadtest.mjs
//
// Default: 30s @ 64 concurrent connections, randomising URL per request.
// Reports p50/p90/p99 + req/s.

import autocannon from 'autocannon';

const URL = process.env.TIDE_URL ?? 'http://localhost:3000';
const TOKEN = process.env.TIDE_TOKEN;
const DURATION = Number(process.env.TIDE_DURATION ?? 30);
const CONNECTIONS = Number(process.env.TIDE_CONNECTIONS ?? 64);

if (!TOKEN) {
  console.error('TIDE_TOKEN required — mint a token at /settings, then export it.');
  process.exit(2);
}

const HOSTS = [
  'https://example.com/articles',
  'https://blog.acme.test/posts',
  'https://news.local/feed',
  'https://docs.tide.test/handbook',
];

// Hex-ish ULID-ish: enough to spread the dedupe key per request.
function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

const instance = autocannon(
  {
    url: `${URL}/api/v1/articles`,
    method: 'POST',
    duration: DURATION,
    connections: CONNECTIONS,
    pipelining: 1,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    setupClient(client) {
      client.setBody = () => {
        const host = HOSTS[Math.floor(Math.random() * HOSTS.length)];
        return JSON.stringify({ url: `${host}/${suffix()}-${suffix()}` });
      };
    },
    requests: [
      {
        method: 'POST',
        path: '/api/v1/articles',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ url: 'https://example.com/articles/seed' }),
      },
    ],
  },
  (err, result) => {
    if (err) {
      console.error('[loadtest] failed', err);
      process.exit(1);
    }
    const out = {
      url: `${URL}/api/v1/articles`,
      duration_s: DURATION,
      connections: CONNECTIONS,
      requests: result.requests,
      throughput_req_s: result.requests.average,
      latency_ms: {
        p50: result.latency.p50,
        p90: result.latency.p90,
        p99: result.latency.p99,
        avg: result.latency.average,
        max: result.latency.max,
      },
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
    };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  },
);

autocannon.track(instance, { renderProgressBar: true });
