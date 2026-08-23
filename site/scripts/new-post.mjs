#!/usr/bin/env node
/**
 * Scaffolds a post folder with the frontmatter every other post already uses.
 *
 * Usage: node scripts/new-post.mjs <english-slug> ["제목"] [topic]
 *
 * The number is one past the highest folder in posts/ (gaps stay gaps), the
 * markdown file is named after the slug, and an already-created empty note is
 * filled in place rather than duplicated — Obsidian often makes the note first.
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../posts');
const [slug, title, topic = 'Dev'] = process.argv.slice(2);

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node scripts/new-post.mjs <english-slug> ["제목"] [topic]');
  process.exit(1);
}

const dirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d{3}-/.test(e.name))
  .map((e) => e.name);

const existing = dirs.find((d) => d.slice(4) === slug);
if (existing && readFileSync(join(ROOT, existing, `${slug}.md`), 'utf8').trim()) {
  console.error(`posts/${existing} already has content`);
  process.exit(1);
}

const next = String(Math.max(0, ...dirs.map((d) => +d.slice(0, 3))) + 1).padStart(3, '0');
const dir = join(ROOT, existing ?? `${next}-${slug}`);
const file = join(dir, `${slug}.md`);
const today = new Date().toLocaleDateString('sv-SE'); // sv-SE is ISO, in local time

mkdirSync(dir, { recursive: true });
writeFileSync(
  file,
  `---
title: "${title ?? slug}"
date: ${today}
topics:
  - "${topic}"
description: "TODO: 한 줄 요약"
draft: true
---
`
);
console.log(file);
