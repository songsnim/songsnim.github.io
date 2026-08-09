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

// Dotted entries are the vault's, not the blog's — Obsidian plugins drop
// `.space` folders wherever the user has been looking, and they must not be
// mistaken for posts.
const hidden = (f) => f.startsWith('.');
const slugs = readdirSync(ROOT).filter(
  (d) => !hidden(d) && statSync(join(ROOT, d)).isDirectory()
);
// A folder is `NNN-<slug>`, where the number is chronological filing and the
// slug alone is the URL. Internal links are written against the URL, so that is
// what the known-post set holds.
const PREFIX = /^(\d{3})-/;
const urlSlug = (dir) => dir.replace(PREFIX, '');
const known = new Set(slugs.map(urlSlug));
if (known.size !== slugs.length) {
  fail('posts', 'two folders share a slug once the index prefix is removed');
}

let images = 0;
const order = [];

for (const slug of slugs) {
  const dir = join(ROOT, slug);
  // The markdown file carries the slug without the index. Obsidian will not let
  // you name a note exactly after the folder it sits in, and the number is a
  // property of the folder's place in the list, not of the article.
  const name = urlSlug(slug);
  const file = join(dir, `${name}.md`);
  const entries = readdirSync(dir);

  if (!PREFIX.test(slug)) {
    fail(slug, 'folder name must start with a three-digit index, e.g. 099-my-post');
  }
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
    fail(slug, `${name}.md is missing — the post file takes the folder name without its index`);
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
  // A key present but blank passes the schema and then breaks something further
  // downstream — an empty topic builds a `/topics/` URL with no segment and
  // takes the whole build down with it.
  for (const key of ['title', 'description']) {
    const value = frontmatter.match(new RegExp(`^${key}: *(.*)$`, 'm'))?.[1] ?? '';
    if (!value.replace(/["']/g, '').trim()) fail(slug, `"${key}" is empty`);
  }
  const topics = frontmatter.match(/^topics:\n((?:[ \t]*-.*\n?)*)/m)?.[1] ?? '';
  for (const [, topic] of topics.matchAll(/^[ \t]*- *(.*)$/gm)) {
    if (!topic.replace(/["']/g, '').trim()) fail(slug, 'topics holds an empty entry');
  }

  const date = frontmatter.match(/^date: (\d{4}-\d{2}-\d{2})$/m);
  if (!date) fail(slug, 'date must be YYYY-MM-DD');
  else order.push({ slug, n: Number(slug.match(PREFIX)?.[1] ?? 0), date: date[1] });

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
    if (!hidden(f) && !f.endsWith('.md') && !used.has(f)) {
      warn(slug, `file is not referenced by the post: ${f}`);
    }
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

// The index only means something if it agrees with the dates. A new post gets
// the next free number, so this catches a backdated one that should have been
// filed earlier — or a number reused after a folder was deleted.
order.sort((a, b) => a.n - b.n);
for (let i = 1; i < order.length; i++) {
  const [prev, cur] = [order[i - 1], order[i]];
  if (cur.n === prev.n) fail(cur.slug, `index ${cur.n} is already taken by ${prev.slug}`);
  else if (cur.date < prev.date) {
    warn(cur.slug, `dated ${cur.date}, but filed after ${prev.slug} (${prev.date})`);
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
