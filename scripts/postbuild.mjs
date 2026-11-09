#!/usr/bin/env node
// Post-build: SPA fallback, sitemap, and a deployability check.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const base = process.env.VITE_BASE ?? '/';
const site = process.env.SITE_URL ?? 'https://ai-detector-5ir.pages.dev';

if (!existsSync(join(dist, 'index.html'))) {
  console.error('postbuild: dist/index.html is missing — the build did not produce output');
  process.exit(1);
}

// SPA fallback. GitHub Pages serves 404.html for unknown paths; copying index.html
// there makes deep links and refreshes work on every host.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`,
);

// The base-path bug is the most common deploy failure in this pipeline: assets
// built for '/' served from '/<repo>/' 404 and the page renders blank. Catch it
// here, where the fix is cheap.
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assetRefs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
const wrong = assetRefs.filter((ref) => ref.startsWith('/assets/') && !ref.startsWith(base));
if (wrong.length > 0) {
  console.error(`postbuild: assets reference ${wrong[0]} but base is "${base}"`);
  console.error('Set VITE_BASE to match the host path. See references/deploy.md.');
  process.exit(1);
}

console.log(`postbuild: ok (base "${base}", 404 fallback and sitemap written)`);
