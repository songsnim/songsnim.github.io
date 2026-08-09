import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    base: '../posts',
    // A post is `<slug>/<slug>.md`. Naming the file after its folder keeps
    // Obsidian's `[[wikilinks]]` and quick-open usable — 98 files all called
    // `index.md` were indistinguishable there. validate-posts.mjs enforces the
    // one-markdown-file-per-folder rule this pattern now relies on.
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\/[^/]+\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    description: z.string(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
