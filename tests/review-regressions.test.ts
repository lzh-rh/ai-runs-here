import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const pathFromRoot = (relativePath: string) => new URL(relativePath, root);
const source = (relativePath: string) => readFileSync(pathFromRoot(relativePath), 'utf8');

describe('deployment artifact', () => {
  it('copies Pagefind into the Vercel static artifact and asserts the browser entry exists', async () => {
    const scriptUrl = pathFromRoot('scripts/sync-pagefind-to-vercel.mjs');
    expect(existsSync(scriptUrl), 'the Pagefind deployment sync script should exist').toBe(true);
    if (!existsSync(scriptUrl)) return;

    const { syncPagefindToVercel } = await import(scriptUrl.href);
    const directory = await mkdtemp(join(tmpdir(), 'pagefind-vercel-'));
    const sourceDirectory = join(directory, 'dist', 'pagefind');
    const staticDirectory = join(directory, '.vercel', 'output', 'static');
    await mkdir(sourceDirectory, { recursive: true });
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, 'pagefind.js'), 'export const ready = true;');
    await writeFile(join(directory, '.vercel', 'output', 'config.json'), '{}');

    const deployedEntry = await syncPagefindToVercel({ sourceDirectory, staticDirectory });

    expect(await readFile(deployedEntry, 'utf8')).toContain('ready = true');
    expect(deployedEntry).toBe(join(staticDirectory, 'pagefind', 'pagefind.js'));
  });

  it('does not manufacture a static directory when the adapter artifact is absent', async () => {
    const scriptUrl = pathFromRoot('scripts/sync-pagefind-to-vercel.mjs');
    if (!existsSync(scriptUrl)) return;
    const { syncPagefindToVercel } = await import(scriptUrl.href);
    const directory = await mkdtemp(join(tmpdir(), 'pagefind-no-vercel-'));
    const sourceDirectory = join(directory, 'dist', 'pagefind');
    const staticDirectory = join(directory, '.vercel', 'output', 'static');
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, 'pagefind.js'), 'export const ready = true;');

    await expect(syncPagefindToVercel({ sourceDirectory, staticDirectory })).rejects.toThrow(
      'Vercel adapter artifact is missing'
    );
  });

  it('runs the deployment assertion as part of every production build', () => {
    const pkg = JSON.parse(source('package.json')) as { scripts: Record<string, string> };

    expect(pkg.scripts.build).toContain('sync-pagefind-to-vercel.mjs');
    expect(pkg.scripts['check:deployment-artifact']).toBeDefined();
    expect(pkg.scripts.verify).toContain('check:deployment-artifact');
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
