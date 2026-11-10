#!/usr/bin/env node
// Performance budget. A bundle that grows past this is a bundle that needs
// fixing, not a budget that needs raising.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMITS = { js: 150 * 1024, css: 40 * 1024, total: 220 * 1024 };
const dir = 'dist/assets';

let js = 0;
let css = 0;
const rows = [];
for (const name of readdirSync(dir)) {
  const path = join(dir, name);
  if (!statSync(path).isFile()) continue;
  const gz = gzipSync(readFileSync(path)).length;
  if (name.endsWith('.js')) js += gz;
  else if (name.endsWith('.css')) css += gz;
  else continue;
  rows.push([name, gz]);
}

const kb = (n) => `${(n / 1024).toFixed(1)}kB`;
rows.sort((a, b) => b[1] - a[1]);
for (const [name, size] of rows) console.log(`  ${kb(size).padStart(8)}  ${name}`);

const failures = [];
if (js > LIMITS.js) failures.push(`JS ${kb(js)} exceeds ${kb(LIMITS.js)}`);
if (css > LIMITS.css) failures.push(`CSS ${kb(css)} exceeds ${kb(LIMITS.css)}`);
if (js + css > LIMITS.total) failures.push(`total ${kb(js + css)} exceeds ${kb(LIMITS.total)}`);

console.log(`\n  js ${kb(js)} · css ${kb(css)} · total ${kb(js + css)} (gzipped)`);
if (failures.length) {
  console.error(`\nbudget exceeded:\n  ${failures.join('\n  ')}`);
  console.error('Route-split, drop a dependency, or do the work differently.');
  process.exit(1);
}
console.log('  within budget');
