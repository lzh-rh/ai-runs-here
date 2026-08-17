import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';
import { resolveBasePath } from '../src/config/site-url.mjs';

const internalOrigin = 'https://internal.example';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      })
    )
  ).flat();
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function routeForFile(root, file, basePath) {
  const path = relative(root, file).split(sep).join('/');
  const route = path === 'index.html'
    ? '/'
    : path.endsWith('/index.html')
      ? `/${path.slice(0, -'index.html'.length)}`
      : `/${path}`;
  return `${basePath}${route.replace(/^\/+/, '')}`;
}

function targetForPath(root, pathname, basePath) {
  const decoded = safeDecode(pathname);
  if (!decoded || !decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\0')) {
    return undefined;
  }

  const artifactPath = basePath === '/'
    ? decoded
    : decoded.startsWith(basePath)
      ? `/${decoded.slice(basePath.length)}`
      : undefined;
  if (!artifactPath) return undefined;

  const relativePath = artifactPath.replace(/^\/+/, '');
  const targetRelative = artifactPath.endsWith('/')
    ? join(relativePath, 'index.html')
    : extname(relativePath)
      ? relativePath
      : join(relativePath, 'index.html');
  const target = resolve(root, targetRelative);
  const rootPrefix = `${resolve(root)}${sep}`;
  return target.startsWith(rootPrefix) ? target : undefined;
}

export async function checkInternalLinks(
  root = join(process.cwd(), 'dist'),
  { basePath = process.env.PUBLIC_BASE_PATH } = {}
) {
  const normalizedBasePath = resolveBasePath(basePath);
  const htmlFiles = (await walk(root)).filter((file) => file.endsWith('.html'));
  const missing = [];
  const targetCache = new Map();

  const fragmentTargets = async (file) => {
    if (!targetCache.has(file)) {
      const $ = load(await readFile(file, 'utf8'));
      const targets = new Set();
      for (const element of $('[id], a[name]').toArray()) {
        const id = $(element).attr('id');
        const name = $(element).attr('name');
        if (id) targets.add(id);
        if (name) targets.add(name);
      }
      targetCache.set(file, targets);
    }
    return targetCache.get(file);
  };

  for (const file of htmlFiles) {
    const sourcePath = relative(root, file).split(sep).join('/');
    const sourceUrl = new URL(routeForFile(root, file, normalizedBasePath), internalOrigin);
    const $ = load(await readFile(file, 'utf8'));

    for (const element of $('a[href]').toArray()) {
      const href = $(element).attr('href');
      if (!href || /^(?:https?:|mailto:|tel:|\/\/)/i.test(href)) continue;

      let url;
      try {
        url = new URL(href, sourceUrl);
      } catch {
        missing.push(`${sourcePath} -> ${href}`);
        continue;
      }
      if (url.origin !== internalOrigin) continue;

      const target = targetForPath(root, url.pathname, normalizedBasePath);
      if (!target || !(await exists(target))) {
        missing.push(`${sourcePath} -> ${href}`);
        continue;
      }

      if (url.hash.length > 1) {
        const fragment = safeDecode(url.hash.slice(1));
        const targets = await fragmentTargets(target);
        if (!fragment || !targets.has(fragment)) {
          missing.push(`${sourcePath} -> ${href} (missing fragment target)`);
        }
      }
    }
  }

  return missing;
}

async function main() {
  const missing = await checkInternalLinks();
  if (missing.length) {
    console.error(missing.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('Internal links: PASS');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
