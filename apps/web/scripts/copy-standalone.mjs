#!/usr/bin/env node
// Post-process the standalone Next.js build into a single-folder deploy:
//   .next/standalone/ ← server.js, package.json, node_modules
//   .next/standalone/.next/static ← static assets
//   .next/standalone/public ← public files
//   .next/standalone/data ← seeded sqlite + local archive dir

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const standalone = join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error('[standalone] .next/standalone not found — did `next build` run with output=standalone?');
  process.exit(1);
}

function copy(src, dest) {
  if (!existsSync(src)) return;
  cpSync(src, dest, { recursive: true });
  console.info(`[standalone] copied ${src} → ${dest}`);
}

copy(join(root, '.next', 'static'), join(standalone, '.next', 'static'));
copy(join(root, 'public'), join(standalone, 'public'));

const dataDir = join(standalone, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const archiveDir = join(dataDir, 'archive');
if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

console.info('[standalone] ready · run with: cd .next/standalone && node server.js');
