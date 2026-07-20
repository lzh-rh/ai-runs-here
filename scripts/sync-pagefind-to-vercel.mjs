import { access, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaultSourceDirectory = resolve('dist/pagefind');
const defaultStaticDirectory = resolve('.vercel/output/static');

async function assertVercelAdapterArtifact(staticDirectory) {
  const configPath = join(dirname(staticDirectory), 'config.json');
  try {
    await access(configPath);
  } catch {
    throw new Error(`Vercel adapter artifact is missing ${configPath}`);
  }
}

export async function assertPagefindArtifact(staticDirectory = defaultStaticDirectory) {
  await assertVercelAdapterArtifact(staticDirectory);
  const deployedEntry = join(staticDirectory, 'pagefind', 'pagefind.js');
  try {
    await access(deployedEntry);
  } catch {
    throw new Error(`Vercel deployment artifact is missing ${deployedEntry}`);
  }
  return deployedEntry;
}

export async function syncPagefindToVercel({
  sourceDirectory = defaultSourceDirectory,
  staticDirectory = defaultStaticDirectory
} = {}) {
  await assertVercelAdapterArtifact(staticDirectory);
  const sourceEntry = join(sourceDirectory, 'pagefind.js');
  try {
    await access(sourceEntry);
  } catch {
    throw new Error(`Pagefind output is missing ${sourceEntry}`);
  }

  const targetDirectory = join(staticDirectory, 'pagefind');
  await mkdir(dirname(targetDirectory), { recursive: true });
  await rm(targetDirectory, { recursive: true, force: true });
  await cp(sourceDirectory, targetDirectory, { recursive: true });
  return assertPagefindArtifact(staticDirectory);
}

async function main() {
  const deployedEntry = process.argv.includes('--check')
    ? await assertPagefindArtifact()
    : await syncPagefindToVercel();
  console.log(`Vercel Pagefind artifact: PASS (${deployedEntry})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
