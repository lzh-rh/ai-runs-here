import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { close, createIndex } from 'pagefind';
import { resolveBasePath } from '../src/config/site-url.mjs';

function assertNoErrors(stage, errors) {
  if (errors.length) throw new Error(`Pagefind ${stage} failed:\n${errors.join('\n')}`);
}

export function resolvePagefindPaths({
  distDirectory = resolve('dist'),
  basePath = process.env.PUBLIC_BASE_PATH
} = {}) {
  const urlPrefix = resolveBasePath(basePath);
  const baseSegment = urlPrefix.replace(/^\/+|\/+$/g, '');
  const nestedSiteDirectory = baseSegment ? join(distDirectory, baseSegment) : distDirectory;
  const nestedArticleDirectory = join(nestedSiteDirectory, 'articles');
  const hasNestedSite = existsSync(join(nestedSiteDirectory, 'index.html')) || existsSync(nestedArticleDirectory);
  const siteDirectory = baseSegment && hasNestedSite
    ? nestedSiteDirectory
    : distDirectory;
  const articleDirectory = join(siteDirectory, 'articles');

  return {
    siteDirectory,
    outputDirectory: join(siteDirectory, 'pagefind'),
    articleDirectory,
    urlPrefix
  };
}

function assertUrlUsesBaseOnce(url, basePath) {
  const baseSegment = basePath.replace(/^\/+|\/+$/g, '');
  const duplicatePrefix = baseSegment ? `${basePath}${baseSegment}/` : '//';
  if (!url.startsWith(basePath) || url.startsWith(duplicatePrefix)) {
    throw new Error(`Pagefind URL must include PUBLIC_BASE_PATH exactly once: ${url}`);
  }
}

export function resolveArticleUrl({ siteDirectory, articleFile, basePath = process.env.PUBLIC_BASE_PATH }) {
  const urlPrefix = resolveBasePath(basePath);
  const relativePath = relative(siteDirectory, articleFile).split(sep).join('/');
  if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error(`Pagefind article is outside the built site root: ${articleFile}`);
  }
  const route = relativePath.replace(/index\.html$/, '');
  const url = `${urlPrefix}${route}`;
  assertUrlUsesBaseOnce(url, urlPrefix);
  return url;
}

async function findArticleFiles(articleDirectory) {
  let entries;
  try {
    entries = await readdir(articleDirectory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(articleDirectory, entry.name, 'index.html'))
    .filter((file) => existsSync(file))
    .sort();
}

export async function buildArticleSearchIndex(options = {}) {
  const paths = resolvePagefindPaths({
    distDirectory: options.distDirectory ?? resolve('dist'),
    basePath: options.basePath
  });
  const siteDirectory = options.siteDirectory ?? paths.siteDirectory;
  const outputDirectory = options.outputDirectory ?? join(siteDirectory, 'pagefind');
  const basePath = resolveBasePath(options.basePath ?? process.env.PUBLIC_BASE_PATH);
  const articleFiles = await findArticleFiles(join(siteDirectory, 'articles'));
  const created = await createIndex();
  assertNoErrors('initialization', created.errors);
  if (!created.index) throw new Error('Pagefind initialization did not return an index.');

  try {
    for (const articleFile of articleFiles) {
      const url = resolveArticleUrl({ siteDirectory, articleFile, basePath });
      const indexed = await created.index.addHTMLFile({
        url,
        content: await readFile(articleFile, 'utf8')
      });
      assertNoErrors('article indexing', indexed.errors);
      assertUrlUsesBaseOnce(indexed.file.url, basePath);
    }

    const written = await created.index.writeFiles({ outputPath: outputDirectory });
    assertNoErrors('artifact write', written.errors);

    const entry = JSON.parse(await readFile(join(outputDirectory, 'pagefind-entry.json'), 'utf8'));
    const artifactCount = Object.values(entry.languages ?? {}).reduce(
      (total, language) => total + Number(language.page_count ?? 0),
      0
    );
    if (artifactCount !== articleFiles.length) {
      throw new Error(
        `Pagefind article scope mismatch: indexed ${articleFiles.length}, artifact contains ${artifactCount}.`
      );
    }

    return articleFiles.length;
  } finally {
    await created.index.deleteIndex();
    await close();
  }
}

async function main() {
  const count = await buildArticleSearchIndex();
  console.log(`Pagefind article index: PASS (${count} ${count === 1 ? 'page' : 'pages'})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
