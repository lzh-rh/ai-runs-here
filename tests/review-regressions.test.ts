import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { resolveBasePath } from '../src/config/site-url.mjs';

const root = new URL('../', import.meta.url);
const pathFromRoot = (relativePath: string) => new URL(relativePath, root);
const source = (relativePath: string) => readFileSync(pathFromRoot(relativePath), 'utf8');

describe('GitHub Pages base path', () => {
  it.each([
    [undefined, '/'],
    ['', '/'],
    ['/', '/'],
    ['ai-runs-here', '/ai-runs-here/'],
    ['/ai-runs-here', '/ai-runs-here/'],
    ['/ai-runs-here/', '/ai-runs-here/']
  ])('normalizes %s to %s', (input, expected) => {
    expect(resolveBasePath(input)).toBe(expected);
  });

  it.each(['//evil.example', '/repo?x=1', '/repo#frag', '/repo/../admin'])('rejects %s', (input) => {
    expect(() => resolveBasePath(input)).toThrow(/base path/i);
  });

  it('installs Chromium for the deployment test projects', () => {
    const workflow = source('.github/workflows/deploy-pages.yml');

    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).not.toContain('npx playwright install --with-deps chromium webkit');
  });

});

describe('publication boundaries and truthful content', () => {
  it('routes every post collection read through the collection validator', () => {
    for (const file of [
      'src/pages/index.astro',
      'src/pages/articles/[id].astro',
      'src/pages/articles/index.astro',
      'src/pages/rss.xml.ts'
    ]) {
      expect(source(file), file).toContain('getPostCollection');
    }
  });

  it('uses the current build mode for every preview-facing post query', () => {
    for (const page of [
      'src/pages/articles/[id].astro',
      'src/pages/articles/index.astro'
    ]) {
      const contents = source(page);
      expect(contents, page).toContain("import.meta.env.PROD ? 'production' : 'development'");
      expect(contents, page).toMatch(/isPublished\([^,]+, mode\)/);
    }
  });

  it('publishes the general Agentic troubleshooting guide and keeps the lab as a draft', () => {
    const guidePath = 'src/content/posts/understanding-agentic-troubleshooting-in-openshift.mdx';
    const labPath = 'src/content/posts/how-agentic-troubleshooting-works-in-openshift.mdx';

    expect(existsSync(pathFromRoot(guidePath)), 'the general Agentic guide should exist').toBe(true);
    expect(existsSync(pathFromRoot(labPath)), 'the original Agentic lab should remain available locally').toBe(true);
    if (existsSync(pathFromRoot(guidePath)) && existsSync(pathFromRoot(labPath))) {
      expect(source(guidePath)).toMatch(/\ndraft: false\n/);
      expect(source(guidePath)).toMatch(/\nkind: guide\n/);
      expect(source(labPath)).toMatch(/\ndraft: true\n/);
      expect(source(labPath)).toMatch(/\nkind: lab\n/);
    }
  });
});

describe('reviewed interface contracts', () => {
  it('contains no removed deployment or integration instructions', async () => {
    const files = ['README.md', 'package.json', '.env.example', 'astro.config.mjs'];
    const text = (await Promise.all(files.map((file) => readFile(pathFromRoot(file), 'utf8')))).join('\n');
    const removedTerms = [
      ['ver', 'cel'],
      ['button', 'down'],
      ['gis', 'cus'],
      ['learning', 'paths']
    ].map((parts) => parts.join(''));

    expect(text).not.toMatch(new RegExp(removedTerms.join('|'), 'i'));
  });

  it('includes the published guide in the axe route loop', () => {
    expect(source('tests/site.spec.ts')).toContain("'/articles/understanding-agentic-troubleshooting-in-openshift/'");
  });
});

describe('canonical site URL validation', () => {
  it('allows localhost only as the development fallback and rejects missing or invalid production values', async () => {
    const moduleUrl = pathFromRoot('src/config/site-url.mjs');
    expect(existsSync(moduleUrl), 'the shared site URL validator should exist').toBe(true);
    if (!existsSync(moduleUrl)) return;

    const { isProductionBuild, resolveSiteUrl } = await import(moduleUrl.href);

    expect(isProductionBuild(['node', 'astro', 'check'], { NODE_ENV: 'production' })).toBe(false);
    expect(isProductionBuild(['node', 'astro', 'build'], {})).toBe(true);
    expect(resolveSiteUrl(undefined, { production: false })).toBe('http://localhost:4321');
    expect(() => resolveSiteUrl(undefined, { production: true })).toThrow('PUBLIC_SITE_URL is required');
    expect(() => resolveSiteUrl('http://localhost:4321', { production: true })).toThrow(
      'localhost is only available during development'
    );
    expect(() => resolveSiteUrl('not-a-url', { production: true })).toThrow('valid absolute HTTP(S) origin');
    expect(() => resolveSiteUrl('https://example.com/blog', { production: true })).toThrow(
      'valid absolute HTTP(S) origin'
    );
    expect(resolveSiteUrl('https://example.com', { production: true })).toBe('https://example.com');
  });
});
