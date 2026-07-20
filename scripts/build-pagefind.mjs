import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { close, createIndex } from 'pagefind';

const articleGlob = 'articles/*/index.html';

function assertNoErrors(stage, errors) {
  if (errors.length) throw new Error(`Pagefind ${stage} failed:\n${errors.join('\n')}`);
}

export async function buildArticleSearchIndex({
  siteDirectory = resolve('dist'),
  outputDirectory = join(siteDirectory, 'pagefind')
} = {}) {
  const created = await createIndex();
  assertNoErrors('initialization', created.errors);
  if (!created.index) throw new Error('Pagefind initialization did not return an index.');

  try {
    const indexed = await created.index.addDirectory({ path: siteDirectory, glob: articleGlob });
    assertNoErrors('article indexing', indexed.errors);

    const written = await created.index.writeFiles({ outputPath: outputDirectory });
    assertNoErrors('artifact write', written.errors);

    const entry = JSON.parse(await readFile(join(outputDirectory, 'pagefind-entry.json'), 'utf8'));
    const artifactCount = Object.values(entry.languages ?? {}).reduce(
      (total, language) => total + Number(language.page_count ?? 0),
      0
    );
    if (artifactCount !== indexed.page_count) {
      throw new Error(
        `Pagefind article scope mismatch: indexed ${indexed.page_count}, artifact contains ${artifactCount}.`
      );
    }

    return indexed.page_count;
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
