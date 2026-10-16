#!/usr/bin/env node
/**
 * npm run pdf -- <variant>   (default: "default")
 *
 * Builds the site, serves it, and prints the résumé and portfolio pages for one
 * variant with the installed Chrome. Output goes to resume/out/ (gitignored).
 * Fails — and writes no résumé — if the sheet overflows one A4 page.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const name = process.argv[2] ?? 'default';
const slug = process.env.RESUME_SLUG || 'resume';
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 4399;
const out = '../resume/out';
const run = (args) => spawnSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=8000', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });

mkdirSync(out, { recursive: true });
const build = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit', env: { ...process.env, RESUME_SLUG: slug } });
if (build.status) process.exit(build.status);

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(port)], { stdio: 'ignore', env: { ...process.env, RESUME_SLUG: slug } });
const base = `http://127.0.0.1:${port}/r/${slug}`;
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/v/${name}/`)).ok) break; } catch {}
    if (i > 50) throw new Error('preview server did not start');
    await new Promise((r) => setTimeout(r, 200));
  }
  if (run(['--dump-dom', `${base}/v/${name}/`]).stdout.match(/class="sheet[^"]*is-over/))
    throw new Error(`resume-${name}: content exceeds one A4 page`);
  for (const [kind, path] of [['resume', 'v'], ['portfolio', 'p']]) {
    const file = `${out}/${kind}-${name}.pdf`;
    run(['--no-pdf-header-footer', `--print-to-pdf=${file}`, `${base}/${path}/${name}/`]);
    console.log(file);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  server.kill();
}
