import { load } from 'cheerio';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/post-collection', () => ({
  getPostCollection: async () => [
    {
      id: 'published-post',
      collection: 'posts',
      data: {
        kind: 'guide',
        title: 'Published post',
        description: 'Published description',
        publishedDate: new Date('2026-08-17T00:00:00.000Z'),
        topic: 'openshift-lightspeed',
        mcpLabels: [],
        tags: [],
        difficulty: 'beginner',
        estimatedMinutes: 1,
        testedVersions: [],
        prerequisites: [],
        draft: false,
        featured: false
      },
      body: '',
      filePath: 'src/content/posts/published-post.mdx',
      digest: 'fixture'
    }
  ]
}));

afterEach(() => vi.unstubAllEnvs());

describe('RSS deployment URLs', () => {
  it.each([
    {
      name: 'repository subpath',
      origin: 'https://example.github.io',
      basePath: '/ai-runs-here/',
      channelUrl: 'https://example.github.io/ai-runs-here/',
      itemUrl: 'https://example.github.io/ai-runs-here/articles/published-post/'
    },
    {
      name: 'custom-domain root',
      origin: 'https://blog.example.com',
      basePath: '/',
      channelUrl: 'https://blog.example.com/',
      itemUrl: 'https://blog.example.com/articles/published-post/'
    }
  ])('keeps the channel and item at the $name', async ({ origin, basePath, channelUrl, itemUrl }) => {
    vi.stubEnv('BASE_URL', basePath);
    const { GET } = await import('../src/pages/rss.xml');
    const response = await GET({ site: new URL(origin) });
    const $ = load(await response.text(), { xmlMode: true });

    expect($('rss > channel > link').first().text()).toBe(channelUrl);
    expect($('rss > channel > item > link').first().text()).toBe(itemUrl);
  });
});
