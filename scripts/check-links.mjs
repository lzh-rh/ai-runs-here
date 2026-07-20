import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { load } from 'cheerio';

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

const root = join(process.cwd(), 'dist');
const htmlFiles = (await walk(root)).filter((file) => file.endsWith('.html'));
const missing = [];

for (const file of htmlFiles) {
  const $ = load(await readFile(file, 'utf8'));
  for (const element of $('a[href]').toArray()) {
    const href = $(element).attr('href');
    if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:|\/\/)/i.test(href)) continue;
    const pathname = href.split(/[?#]/)[0];
    const relative = pathname.startsWith('/')
      ? pathname.slice(1)
      : normalize(join(dirname(file.slice(root.length + 1)), pathname));
    const target =
      relative.endsWith('.html') || relative.includes('.')
        ? join(root, relative)
        : join(root, relative, 'index.html');
    if (!(await exists(target))) missing.push(`${file.slice(root.length + 1)} -> ${href}`);
  }
}

if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}
console.log('Internal links: PASS');
