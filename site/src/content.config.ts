import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    base: '../posts',
    // A post is `NNN-<slug>/<slug>.md`. Naming the file after its slug keeps
    // Obsidian's `[[wikilinks]]` and quick-open usable — 98 files all called
    // `index.md` were indistinguishable there — while the folder's `NNN-`
    // prefix, which is chronological, makes the folder list read oldest to
    // newest instead of alphabetically. validate-posts.mjs enforces both.
    pattern: '**/*.md',
    // The prefix is a filing device, not part of the post's identity: it is
    // stripped here so the URL stays what it has always been. Renumbering or
    // reordering folders must never move a published page.
    generateId: ({ entry }) => entry.replace(/\/[^/]+\.md$/, '').replace(/^\d{3}-/, ''),
  }),
  schema: z.object({
    // `.min(1)` on the text fields, not a bare `z.string()`: an empty `title:`
    // or `description:` is valid YAML, so a key left blank while drafting used
    // to pass every check and ship a post with an empty <title>, an empty card
    // in the index, and an empty OG description. Blank is a missing value, so
    // it fails here the same way a missing key does.
    title: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // `topics`, not `tags`: Obsidian claims the `tags` frontmatter key for the
    // vault's own tag pane, so a blog tag would show up there and a vault tag
    // would show up on the site. Separate keys keep the two systems apart.
    topics: z.array(z.string()).default([]),
    description: z.string().min(1),
    cover: z.string().min(1).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
