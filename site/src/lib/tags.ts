import { getCollection } from 'astro:content';

/**
 * Tag display names are kept exactly as written in the posts. Only the URL is
 * slugified, so a tag like `스택/큐` cannot break the route.
 */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/[/\s]+/g, '-');
}

export type TagInfo = { tag: string; slug: string; count: number };

/**
 * A post with no tags is still worth finding. `None` is not written into any
 * post — it is a synthetic bucket that collects the untagged ones, so nothing
 * falls off the tag index.
 */
export const UNTAGGED = 'None';

export async function getTags(): Promise<TagInfo[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.data.topics) counts.set(t, (counts.get(t) ?? 0) + 1);

  const seen = new Map<string, string>();
  const tags: TagInfo[] = [];
  for (const [tag, count] of counts) {
    const slug = tagSlug(tag);
    const clash = seen.get(slug);
    if (clash) throw new Error(`Tag slug collision: "${clash}" and "${tag}" both map to "${slug}"`);
    if (slug === tagSlug(UNTAGGED)) {
      throw new Error(`"${tag}" collides with the synthetic ${UNTAGGED} bucket — rename it`);
    }
    seen.set(slug, tag);
    tags.push({ tag, slug, count });
  }
  tags.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const untagged = posts.filter((p) => p.data.topics.length === 0).length;
  if (untagged) tags.push({ tag: UNTAGGED, slug: tagSlug(UNTAGGED), count: untagged });
  return tags;
}
