import { getCollection } from 'astro:content';

/**
 * Topic display names are kept exactly as written in the posts. Only the URL is
 * slugified, so a topic like `스택/큐` cannot break the route.
 *
 * The word is "topic" everywhere on the blog side. "Tag" belongs to Obsidian,
 * which owns the `tags` frontmatter key for the vault's own tag pane.
 */
export function topicSlug(topic: string): string {
  return topic.trim().toLowerCase().replace(/[/\s]+/g, '-');
}

export type TopicInfo = { topic: string; slug: string; count: number };

/**
 * A post with no topics is still worth finding. `None` is not written into any
 * post — it is a synthetic bucket that collects the untopiced ones, so nothing
 * falls off the topic index.
 */
export const NO_TOPIC = 'None';

export async function getTopics(): Promise<TopicInfo[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.data.topics) counts.set(t, (counts.get(t) ?? 0) + 1);

  const seen = new Map<string, string>();
  const topics: TopicInfo[] = [];
  for (const [topic, count] of counts) {
    const slug = topicSlug(topic);
    const clash = seen.get(slug);
    if (clash) {
      throw new Error(`Topic slug collision: "${clash}" and "${topic}" both map to "${slug}"`);
    }
    if (slug === topicSlug(NO_TOPIC)) {
      throw new Error(`"${topic}" collides with the synthetic ${NO_TOPIC} bucket — rename it`);
    }
    seen.set(slug, topic);
    topics.push({ topic, slug, count });
  }
  topics.sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));

  const none = posts.filter((p) => p.data.topics.length === 0).length;
  if (none) topics.push({ topic: NO_TOPIC, slug: topicSlug(NO_TOPIC), count: none });
  return topics;
}
