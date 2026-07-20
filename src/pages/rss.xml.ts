import rss from '@astrojs/rss';
import { siteConfig } from '../config/site';
import { getPostCollection } from '../lib/post-collection';
import { isPublished, sortNewest } from '../lib/posts';

export async function GET(context: { site?: URL }) {
  const posts = sortNewest(
    (await getPostCollection()).filter((post) => isPublished(post, 'production'))
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedDate,
      link: `/articles/${post.id}/`
    }))
  });
}
