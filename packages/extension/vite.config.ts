import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const target = process.env.TARGET === 'firefox' ? 'firefox' : 'chrome';
const outDir = `dist/${target}`;

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        popup: 'src/popup.ts',
        options: 'src/options.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        format: 'esm',
      },
    },
  },
  plugins: [
    {
      name: 'copy-static',
      closeBundle() {
        const dest = join(process.cwd(), outDir);
        if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
        const manifest = `public/manifest.${target}.json`;
        copyFileSync(manifest, join(dest, 'manifest.json'));
        for (const f of ['popup.html', 'options.html']) {
          copyFileSync(join('public', f), join(dest, f));
        }
        if (existsSync('public/icons')) {
          mkdirSync(join(dest, 'icons'), { recursive: true });
          for (const f of readdirSync('public/icons')) {
            const src = join('public/icons', f);
            if (statSync(src).isFile()) copyFileSync(src, join(dest, 'icons', f));
          }
        }
      },
    },
  ],
});
