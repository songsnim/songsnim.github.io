#!/usr/bin/env node
/**
 * Pre-build gate for the posts/ directory.
 *
 * The publish flow is "commit and push from Obsidian", which means nothing
 * checks a post before it leaves the machine. This script is that check: it
 * runs in CI ahead of the build, and a failure here stops the deploy so the
 * currently published site stays up.
 *
 * Astro's own build already fails on a missing local image or a bad frontmatter
 * schema. This covers what it does not: dangling internal links, math blocks
 * that silently swallow the rest of a post, and images hotlinked off other
 * people's servers.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../posts');
const REQUIRED = ['title', 'date', 'topics', 'description', 'draft'];

const errors = [];
const warnings = [];
const fail = (slug, msg) => errors.push(`${slug}: ${msg}`);
const warn = (slug, msg) => warnings.push(`${slug}: ${msg}`);

if (!existsSync(ROOT)) {
  console.error(`posts/ not found at ${ROOT}`);
  process.exit(1);
}

const slugs = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory());
const known = new Set(slugs);

let images = 0;

for (const slug of slugs) {
  const dir = join(ROOT, slug);
  const file = join(dir, `${slug}.md`);
  const entries = readdirSync(dir);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(slug, 'folder name is not a lowercase kebab-case slug');
  }

  // The loader takes every .md in the folder and derives the URL from the
  // folder name, so a second markdown file becomes a second post at the same
  // URL, and a renamed one silently detaches from its folder.
  const markdown = entries.filter((f) => f.endsWith('.md'));
  if (markdown.length > 1) {
    fail(slug, `folder holds ${markdown.length} markdown files, expected one: ${markdown.join(', ')}`);
  }
  if (!existsSync(file)) {
    fail(slug, `${slug}.md is missing — the post file must be named after its folder`);
    continue;
  }

  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    fail(slug, 'frontmatter block is missing');
    continue;
  }
  const [, frontmatter, body] = match;

  for (const key of REQUIRED) {
    if (!new RegExp(`^${key}:`, 'm').test(frontmatter)) fail(slug, `frontmatter is missing "${key}"`);
  }
  if (!/^date: \d{4}-\d{2}-\d{2}$/m.test(frontmatter)) {
    fail(slug, 'date must be YYYY-MM-DD');
  }

  const cover = frontmatter.match(/^cover: "\.\/(.+)"$/m);
  if (cover && !existsSync(join(dir, cover[1]))) {
    fail(slug, `cover file not found: ${cover[1]}`);
  }

  // Images: local files must exist, remote ones will break when the host does.
  const used = new Set();
  for (const [, url] of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    images++;
    if (url.startsWith('./')) {
      const name = url.slice(2);
      used.add(name);
      if (!existsSync(join(dir, name))) fail(slug, `image file not found: ${name}`);
    } else if (/^https?:/.test(url)) {
      warn(slug, `image is hotlinked, not stored with the post: ${url.slice(0, 60)}`);
    } else {
      fail(slug, `image path must start with ./ — got ${url}`);
    }
  }
  for (const f of entries) {
    if (!f.endsWith('.md') && !used.has(f)) warn(slug, `file is not referenced by the post: ${f}`);
  }

  // Internal links must point at a post that exists.
  for (const [, href] of body.matchAll(/\]\(\/posts\/([^)/#?]+)/g)) {
    if (!known.has(href)) fail(slug, `internal link points at a post that does not exist: ${href}`);
  }

  // Two display-math blocks with no blank line between them make remark-math
  // mis-pair the delimiters and swallow the rest of the post.
  if (/^\$\$[ \t]*\n\$\$[ \t]*$/m.test(body)) {
    fail(slug, 'two $$ blocks are adjacent — leave a blank line between them');
  }
  const outsideFences = body.replace(/```[\s\S]*?```/g, '');
  if ((outsideFences.match(/\$\$/g) ?? []).length % 2 !== 0) {
    fail(slug, 'unbalanced $$ delimiters');
  }

  if (/^# /m.test(body)) {
    warn(slug, 'body uses an h1 — the post title is already the h1');
  }
  if (body.includes('songsnim.github.io/20') || body.includes('velog.io/@thddudwo1313')) {
    warn(slug, 'links to the old blog instead of the local post');
  }
}

console.log(`Checked ${slugs.length} posts and ${images} image references.`);

for (const w of warnings) console.log(`  warning  ${w}`);
for (const e of errors) console.error(`  error    ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s). Fix them and push again — nothing was deployed.`);
  process.exit(1);
}
console.log(warnings.length ? `\n${warnings.length} warning(s), no errors.` : '\nNo problems found.');
