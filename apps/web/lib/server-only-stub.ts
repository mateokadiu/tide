// No-op stub for the `server-only` package.
//
// Why: the `server-only` package throws at import time as a safety net to keep
// server-side modules from leaking into a client bundle. When the Next.js
// bundler resolves this package for an RSC/server build, it replaces it with a
// no-op. But standalone Node processes (our BullMQ worker, the seed script,
// the migrate CLI) hit the throw and crash.
//
// The `tsconfig.worker.json` aliases `server-only` to this file so the worker
// process runs without the throw — while the main Next.js build keeps the real
// `server-only` package and its safety guarantee.
export {};
