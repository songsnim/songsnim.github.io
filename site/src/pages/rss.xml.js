import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Songsnim',
    description: 'ML 엔지니어링과 시스템 운영을 다루는 기술 블로그.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.topics,
      link: `/posts/${post.id}`,
    })),
    customData: '<language>ko</language>',
  });
}
