import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptUrl = new URL('../scripts/check-links.mjs', import.meta.url);

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'check-links-'));
  for (const [relativePath, html] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, html);
  }
  return root;
}

describe('internal route and fragment validation', () => {
  it('reports missing same-page and cross-page fragments', async () => {
    const { checkInternalLinks } = await import(scriptUrl.href);
    const root = await fixture({
      'index.html': '<a href="#missing-home">Broken same page</a><a href="/guide/#missing-guide">Broken cross page</a>',
      'guide/index.html': '<h1 id="guide-title">Guide</h1>'
    });

    await expect(checkInternalLinks(root, { basePath: '/' })).resolves.toEqual([
      'index.html -> #missing-home (missing fragment target)',
      'index.html -> /guide/#missing-guide (missing fragment target)'
    ]);
  });

  it('accepts safely decoded paths and fragments while preserving route checks', async () => {
    const { checkInternalLinks } = await import(scriptUrl.href);
    const root = await fixture({
      'index.html': [
        '<a href="/articles/%73tart/#start%2Dhere">Encoded route</a>',
        '<a href="/missing/">Missing route</a>',
        '<a href="https://example.com/#external">External</a>'
      ].join(''),
      'articles/start/index.html': '<h1 id="start-here">Start</h1>'
    });

    await expect(checkInternalLinks(root, { basePath: '/' })).resolves.toEqual(['index.html -> /missing/']);
  });

  it('resolves repository-subpath URLs against the static artifact root', async () => {
    const { checkInternalLinks } = await import(scriptUrl.href);
    const root = await fixture({
      'index.html': '<a href="/ai-runs-here/guide/#start-here">Guide</a>',
      'guide/index.html': '<h1 id="start-here">Guide</h1>'
    });

    await expect(checkInternalLinks(root, { basePath: '/ai-runs-here/' })).resolves.toEqual([]);
  });
});
