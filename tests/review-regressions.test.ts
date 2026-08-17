import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveBasePath } from '../src/config/site-url.mjs';

const root = new URL('../', import.meta.url);
const pathFromRoot = (relativePath: string) => new URL(relativePath, root);
const source = (relativePath: string) => readFileSync(pathFromRoot(relativePath), 'utf8');

describe('GitHub Pages deployment artifact', () => {
  it.each([
    ['root output', '/', ''],
    ['repository-subpath output', '/ai-runs-here/', 'ai-runs-here']
  ])('locates %s and writes Pagefind next to the built site root', async (_name, basePath, siteSegment) => {
    const scriptUrl = pathFromRoot('scripts/build-pagefind.mjs');
    const { buildArticleSearchIndex, resolveArticleUrl, resolvePagefindPaths } = await import(scriptUrl.href);
    const directory = await mkdtemp(join(tmpdir(), 'pagefind-paths-'));
    const distDirectory = join(directory, 'dist');
    const siteDirectory = siteSegment ? join(distDirectory, siteSegment) : distDirectory;
    await mkdir(join(siteDirectory, 'articles', 'published-post'), { recursive: true });
    await writeFile(
      join(siteDirectory, 'articles', 'published-post', 'index.html'),
      '<html lang="en"><body><article data-pagefind-body>Published article</article></body></html>'
    );
    const articleFile = join(siteDirectory, 'articles', 'published-post', 'index.html');

    expect(resolvePagefindPaths({ distDirectory, basePath })).toEqual({
      siteDirectory,
      outputDirectory: join(siteDirectory, 'pagefind'),
      articleDirectory: join(siteDirectory, 'articles'),
      urlPrefix: basePath
    });
    expect(resolveArticleUrl({ siteDirectory, articleFile, basePath })).toBe(
      `${basePath}articles/published-post/`
    );
    expect(await buildArticleSearchIndex({ distDirectory, basePath })).toBe(1);
    expect(existsSync(join(siteDirectory, 'pagefind', 'pagefind.js'))).toBe(true);
  });

  it('locates an empty repository-subpath output from its site entry point', async () => {
    const { resolvePagefindPaths } = await import(pathFromRoot('scripts/build-pagefind.mjs').href);
    const directory = await mkdtemp(join(tmpdir(), 'pagefind-empty-paths-'));
    const distDirectory = join(directory, 'dist');
    const siteDirectory = join(distDirectory, 'ai-runs-here');
    await mkdir(siteDirectory, { recursive: true });
    await writeFile(join(siteDirectory, 'index.html'), '<html lang="en"><body>Empty site</body></html>');

    expect(resolvePagefindPaths({ distDirectory, basePath: '/ai-runs-here/' }).siteDirectory)
      .toBe(siteDirectory);
  });

  it('indexes only article detail routes and still writes an empty article index', async () => {
    const scriptUrl = pathFromRoot('scripts/build-pagefind.mjs');
    expect(existsSync(scriptUrl), 'the scoped Pagefind build script should exist').toBe(true);
    if (!existsSync(scriptUrl)) return;

    const { buildArticleSearchIndex } = await import(scriptUrl.href);
    const directory = await mkdtemp(join(tmpdir(), 'pagefind-scope-'));
    const siteDirectory = join(directory, 'dist');
    const outputDirectory = join(siteDirectory, 'pagefind');
    await mkdir(join(siteDirectory, 'articles', 'published-post'), { recursive: true });
    await mkdir(join(siteDirectory, 'about'), { recursive: true });
    await writeFile(
      join(siteDirectory, 'articles', 'published-post', 'index.html'),
      '<html lang="en"><body><article data-pagefind-body>Published article</article></body></html>'
    );
    await writeFile(
      join(siteDirectory, 'about', 'index.html'),
      '<html lang="en"><body>About page must not be indexed</body></html>'
    );

    expect(await buildArticleSearchIndex({ siteDirectory, outputDirectory })).toBe(1);
    expect(JSON.parse(await readFile(join(outputDirectory, 'pagefind-entry.json'), 'utf8')))
      .toMatchObject({ languages: { en: { page_count: 1 } } });

    const emptyDirectory = await mkdtemp(join(tmpdir(), 'pagefind-empty-scope-'));
    const emptySite = join(emptyDirectory, 'dist');
    const emptyOutput = join(emptySite, 'pagefind');
    await mkdir(join(emptySite, 'about'), { recursive: true });
    await writeFile(join(emptySite, 'about', 'index.html'), '<html><body>About only</body></html>');

    expect(await buildArticleSearchIndex({ siteDirectory: emptySite, outputDirectory: emptyOutput })).toBe(0);
    expect(JSON.parse(await readFile(join(emptyOutput, 'pagefind-entry.json'), 'utf8')))
      .toMatchObject({ languages: {} });
    expect(existsSync(join(emptyOutput, 'pagefind.js'))).toBe(true);
  });
});

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
});

describe('publication boundaries and truthful content', () => {
  it('routes every post collection read through the collection validator', () => {
    for (const file of [
      'src/pages/index.astro',
      'src/pages/articles/[id].astro',
      'src/pages/articles/index.astro',
      'src/pages/rss.xml.ts',
      'src/layouts/PostLayout.astro'
    ]) {
      expect(source(file), file).toContain('getPostCollection');
    }
  });

  it('uses the current build mode for every preview-facing post query', () => {
    for (const page of [
      'src/pages/articles/[id].astro',
      'src/pages/articles/index.astro',
      'src/layouts/PostLayout.astro'
    ]) {
      const contents = source(page);
      expect(contents, page).toContain("import.meta.env.PROD ? 'production' : 'development'");
      expect(contents, page).toMatch(/isPublished\([^,]+, mode\)/);
    }
  });

  it('keeps the illustrative MCP outline private and publishes a non-lab reading guide', () => {
    const draft = source('src/content/posts/connect-mcp-server-to-lightspeed.mdx');
    const guidePath = 'src/content/posts/start-learning-applied-ai-on-openshift.mdx';

    expect(draft).toMatch(/\ndraft: true\n/);
    expect(draft).toMatch(/\nkind: lab\n/);
    expect(draft).not.toMatch(/verified (?:OpenShift Lightspeed )?query/i);
    expect(draft).toContain('This draft does not connect an MCP server or perform a Lightspeed query.');
    expect(existsSync(pathFromRoot(guidePath)), 'a truthful published guide should exist').toBe(true);
    if (existsSync(pathFromRoot(guidePath))) {
      expect(source(guidePath)).toMatch(/\ndraft: false\n/);
      expect(source(guidePath)).toMatch(/\nkind: guide\n/);
      expect(source(guidePath)).toContain('This is a reading guide, not a product lab.');
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

  it('clearly labels draft cards and article metadata during development', () => {
    const postCard = source('src/components/PostCard.astro');
    const article = source('src/layouts/PostLayout.astro');

    expect(postCard).toContain('post.data.draft');
    expect(postCard).toContain('Draft preview');
    expect(article).toContain("post.data.draft ? 'Draft preview' : 'Field note'");
    expect(article).toContain("post.data.draft ? 'Draft date' : 'Published'");
    expect(article).toContain('publishedDate={post.data.draft ? undefined : post.data.publishedDate}');
  });
  it('identifies Li and the approved professional focus on the About page', () => {
    const about = source('src/pages/about.astro');

    expect(about).toContain('Li');
    expect(about).toContain('Technical Marketing Manager');
    expect(about).toContain('Applied AI in OpenShift');
  });

  it('includes a representative published article in the axe route loop', () => {
    expect(source('tests/site.spec.ts')).toContain("'/articles/start-learning-applied-ai-on-openshift/'");
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
