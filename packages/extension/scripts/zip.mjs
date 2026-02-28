#!/usr/bin/env node
// Zip the chrome + firefox bundles for store distribution.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const target of ['chrome', 'firefox']) {
  const dir = resolve(`dist/${target}`);
  if (!existsSync(dir)) {
    console.error(`[zip] ${dir} missing — build first`);
    process.exit(1);
  }
  const out = resolve(`tide-${target}-0.1.0.zip`);
  execSync(`cd ${dir} && zip -qr ${out} .`, { stdio: 'inherit' });
  console.info(`[zip] ${out}`);
}
