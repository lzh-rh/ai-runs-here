import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isPublished } from '../src/lib/posts';

const sourcePath = (relativePath: string) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

function source(relativePath: string) {
  const path = sourcePath(relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('production publication boundary', () => {
  it('excludes drafts from every downstream production query', () => {
    const draft = { id: 'private-draft', data: { draft: true } } as never;
    expect(isPublished(draft, 'production')).toBe(false);
  });

  it('applies the same production boundary to RSS before sorting', () => {
    const feed = source('src/pages/rss.xml.ts');

    expect(feed).toContain("isPublished(post, 'production')");
    expect(feed).toMatch(/sortNewest\([\s\S]*getPostCollection\(\)[\s\S]*\.filter/);
    expect(feed).toContain("link: `/articles/${post.id}/`");
  });
});

describe('article metadata', () => {
  it('publishes article dates while retaining site-derived canonical URLs', () => {
    const baseLayout = source('src/layouts/BaseLayout.astro');
    const postLayout = source('src/layouts/PostLayout.astro');

    expect(baseLayout).toContain('publishedDate?: Date');
    expect(baseLayout).toContain('updatedDate?: Date');
    expect(baseLayout).toContain('property="article:published_time"');
    expect(baseLayout).toContain('property="article:modified_time"');
    expect(baseLayout).toContain('new URL(Astro.url.pathname, Astro.site)');
    expect(postLayout).toContain('publishedDate={post.data.draft ? undefined : post.data.publishedDate}');
    expect(postLayout).toContain('updatedDate={post.data.updatedDate}');
  });
});
