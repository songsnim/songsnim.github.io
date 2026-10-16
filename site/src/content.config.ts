import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { execFileSync } from 'node:child_process';

// The date on a post is the moment it was first published, not the moment the
// file was created — writing can sit in `draft: true` for weeks. Git already
// records that moment: the first commit that put `draft: false` into the file.
// Reading it back each build keeps the value out of the frontmatter, so editing
// a published post never moves its date. Writing an explicit `published:` overrides
// this, which is the only way to change it by hand.
function firstPublished(filePath: string): Date {
  try {
    const log = execFileSync(
      'git',
      ['log', '--reverse', '--format=%cI', '-S', 'draft: false', '--', filePath],
      { encoding: 'utf8' }
    ).trim();
    if (log) return new Date(log.split('\n')[0]);
  } catch {
    // No git history here (a shallow clone, or a tarball) — fall through.
  }
  // Not published from this checkout yet: only reachable while drafting locally.
  return new Date();
}

const files = glob({
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
});

const posts = defineCollection({
  // The glob loader does the reading; this only fills in the dates it could not
  // know, after the files are in the store.
  loader: {
    ...files,
    load: async (ctx) => {
      await files.load(ctx);
      for (const [, entry] of ctx.store.entries()) {
        if (entry.data.published) continue;
        // Dropping the digest is deliberate: `store.set` ignores a write whose
        // digest matches what is already stored, so keeping it would throw the
        // date away. The post is re-parsed on the next build instead, which is
        // what a post with no date in its frontmatter has to do anyway.
        const { digest, ...rest } = entry;
        ctx.store.set({ ...rest, data: { ...entry.data, published: firstPublished(entry.filePath!) } });
      }
    },
  },
  schema: z.object({
    // `.min(1)` on the text fields, not a bare `z.string()`: an empty `title:`
    // or `description:` is valid YAML, so a key left blank while drafting used
    // to pass every check and ship a post with an empty <title>, an empty card
    // in the index, and an empty OG description. Blank is a missing value, so
    // it fails here the same way a missing key does.
    title: z.string().min(1),
    // Optional: filled from git by `firstPublished` when it is absent.
    published: z.coerce.date().optional(),
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

// One folder per case study under resume/, same filing convention as posts.
const cases = defineCollection({
  loader: glob({
    base: '../resume/cases',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\/[^/]+\.md$/, '').replace(/^\d+-/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    role: z.string().min(1),
    period: z.string().min(1),
    summary: z.string().min(1),
    stack: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, cases };
