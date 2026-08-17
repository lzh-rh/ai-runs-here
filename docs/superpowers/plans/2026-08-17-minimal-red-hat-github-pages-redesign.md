# Minimal Red Hat GitHub Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign AI Runs Here as a minimal Red Hat-aligned static blog focused on OpenShift Lightspeed, Agentic Lightspeed, and MCP, and deploy it through GitHub Pages instead of Vercel.

**Architecture:** Keep Astro Content Collections, Markdown/MDX, Pagefind, RSS, sitemap, and the existing publication safeguards. Replace the current workbench-style UI and learning-path/integration features with a small RHDS-inspired shell, three topic routes, one-input search, and base-path-safe navigation. GitHub Actions builds, verifies, packages, and deploys the static `dist/` artifact to GitHub Pages.

**Tech Stack:** Node.js 22.12+, npm, Astro 7+, TypeScript, MDX, Astro Content Collections, Pagefind, Vitest, Playwright, axe-core, GitHub Actions, GitHub Pages.

## Global Constraints

- Site title is `AI Runs Here`; subtitle is `Applied AI on OpenShift`.
- Primary topics are exactly `openshift-lightspeed`, `agentic-lightspeed`, and `mcp`.
- MCP labels are exactly `mcp-gateway`, `mcp-server`, and `mcp-lifecycle-operator`.
- Non-MCP posts must not use MCP labels.
- The site is personal and unofficial; do not use the Red Hat logo or imply official Red Hat ownership.
- Use Red Hat Display for headings, Red Hat Text for body/navigation, and Red Hat Mono only for technical content, all with system fallbacks.
- Use `#EE0000`, `#A60000`, `#151515`, `#4F5255`, `#D2D2D2`, `#F2F2F2`, `#FFFFFF`, and `#0066CC` only through semantic CSS tokens.
- Use sentence case, underlined inline links, a 789px maximum reading column, 16px mobile gutters, 32px desktop gutters, and 64px desktop section spacing.
- Remove newsletter, comments, Learning paths, terminal status, advanced search filters, decorative card grids, and Vercel code from source, dependencies, tests, documentation, and production output.
- Keep Markdown/MDX authoring, draft exclusion, Pagefind, RSS, sitemap, canonical/social metadata, link validation, accessibility, reduced motion, long-token containment, and code-copy behavior.
- Support both a GitHub project subpath and a custom-domain root path.
- Do not publish or fabricate unverified lab claims.

---

## File Map

```text
src/content.config.ts                  Three-topic schema and controlled MCP labels
src/config/site.ts                     Minimal navigation, topic content, base-path helpers
src/config/site-url.mjs                Site URL and GitHub Pages base-path validation
src/content/posts/*.mdx                Migrated truthful topic metadata; no learningPath fields
src/lib/posts.ts                       Published sorting and related-topic helpers only
src/lib/posts.test.ts                  Query behavior without learning paths
src/lib/post-collection.ts             Collection validation including MCP-label rules
src/styles/global.css                  RHDS editorial-minimal tokens and responsive foundation
src/components/Header.astro            Base-path-safe desktop/mobile navigation
src/components/Footer.astro            Minimal disclaimer, RSS, and source links
src/components/PostCard.astro          Plain bordered article row
src/components/SearchPanel.astro       One-input Pagefind search
src/components/CodeCopy.astro          Existing progressive code copy
src/layouts/BaseLayout.astro           Base-path-safe metadata, fonts, header, and footer
src/layouts/PostLayout.astro           Minimal article layout without comments/path navigation
src/pages/index.astro                  Intro, three topic rows, newest articles
src/pages/topics/[topic].astro         Static topic routes and empty states
src/pages/articles/index.astro         One-input search and chronological article list
src/pages/articles/[id].astro          Published/draft-preview article routes
src/pages/about.astro                  Minimal owner/method/disclaimer page
src/pages/rss.xml.ts                   Base-path-safe published feed
public/fonts/*                         Self-hosted Red Hat font files, if licensed assets are available
public/social-default.svg              Minimal white/red social artwork
scripts/build-pagefind.mjs             Base-path-aware article-only search artifact
scripts/check-links.mjs                Existing route/fragment validation
.github/workflows/deploy-pages.yml     Verified GitHub Pages build and deployment
astro.config.mjs                       Static Astro site/base configuration without an adapter
package.json                           GitHub Pages build and verification commands
playwright.config.ts                   Root/subpath browser projects with no integration env
tests/content-schema.test.ts           Topic/MCP-label validation
tests/review-regressions.test.ts        Base-path and artifact regression tests
tests/site.spec.ts                     Minimal navigation/search/topic/article accessibility tests
README.md                              Minimal authoring and GitHub Pages operations guide

Delete:
src/components/NewsletterForm.astro
src/components/GiscusComments.astro
src/components/TerminalStatus.astro
src/components/TopicRail.astro
src/pages/learning-paths/index.astro
scripts/sync-pagefind-to-vercel.mjs
```

---

### Task 1: Migrate the content taxonomy and remove learning-path data

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/config/site.ts`
- Modify: `src/lib/posts.ts`
- Modify: `src/lib/posts.test.ts`
- Modify: `src/lib/post-collection.ts`
- Modify: `src/content/posts/start-learning-applied-ai-on-openshift.mdx`
- Modify: `src/content/posts/connect-mcp-server-to-lightspeed.mdx`
- Modify: `tests/content-schema.test.ts`
- Modify: `tests/draft-output.test.ts`

**Interfaces:**
- Produces: `Topic`, `McpLabel`, `topicConfig`, `mcpLabelConfig`, `validatePostCollection(posts)`, `sortNewest(posts)`, and `getRelatedPosts(posts, currentId, limit)`.
- Consumes: Astro `CollectionEntry<'posts'>` and existing publication mode behavior.

- [ ] **Step 1: Write failing taxonomy tests**

Update `tests/content-schema.test.ts` with these exact expectations:

```ts
import { describe, expect, it } from 'vitest';
import { postSchema } from '../src/content.config';

const base = {
  kind: 'guide',
  title: 'Understand OpenShift Lightspeed behavior',
  description: 'A sufficiently complete description for a focused technical field note.',
  publishedDate: new Date('2026-08-17'),
  topic: 'openshift-lightspeed',
  mcpLabels: [],
  tags: [],
  difficulty: 'beginner',
  estimatedMinutes: 5,
  testedVersions: [],
  prerequisites: [],
  draft: false,
  featured: false
};

describe('minimal topic schema', () => {
  it.each(['openshift-lightspeed', 'agentic-lightspeed', 'mcp'])('accepts topic %s', (topic) => {
    expect(postSchema.safeParse({ ...base, topic }).success).toBe(true);
  });

  it.each(['openshift-ai', 'agentic-ai', 'lightspeed'])('rejects removed topic %s', (topic) => {
    expect(postSchema.safeParse({ ...base, topic }).success).toBe(false);
  });

  it.each(['mcp-gateway', 'mcp-server', 'mcp-lifecycle-operator'])('accepts MCP label %s', (label) => {
    expect(postSchema.safeParse({ ...base, topic: 'mcp', mcpLabels: [label] }).success).toBe(true);
  });

  it('rejects MCP labels on a non-MCP post', () => {
    expect(postSchema.safeParse({ ...base, mcpLabels: ['mcp-server'] }).success).toBe(false);
  });

  it('does not accept the removed learningPath field', () => {
    expect(postSchema.safeParse({ ...base, learningPath: { id: 'mcp', order: 1 } }).success).toBe(false);
  });
});
```

Make the schema object strict so removed fields cannot silently survive.

- [ ] **Step 2: Run the taxonomy tests and confirm the red state**

Run: `npm test -- tests/content-schema.test.ts`

Expected: FAIL because new topics and `mcpLabels` are not defined and the old schema still accepts `learningPath`.

- [ ] **Step 3: Implement the exact schema contract**

In `src/content.config.ts`, replace the topic tuple and learning-path field with:

```ts
export const topics = ['openshift-lightspeed', 'agentic-lightspeed', 'mcp'] as const;
export const mcpLabels = ['mcp-gateway', 'mcp-server', 'mcp-lifecycle-operator'] as const;

const postFields = z.object({
  kind: z.enum(contentKinds),
  title: trimmedString.min(8),
  description: trimmedString.min(20).max(180),
  publishedDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  topic: z.enum(topics),
  mcpLabels: z.array(z.enum(mcpLabels)).default([]),
  tags: z.array(trimmedString.min(1)).default([]),
  difficulty: z.enum(difficulties),
  estimatedMinutes: z.number().int().positive(),
  testedVersions: z.array(trimmedString.min(3)),
  prerequisites: z.array(trimmedString.min(3)).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  image: trimmedString.regex(/^\/(?!\/)\S+$/, 'Image must be a root-relative public asset path.').optional()
}).strict();
```

Preserve the published-lab and update-date refinements, then add:

```ts
if (post.topic !== 'mcp' && post.mcpLabels.length > 0) {
  context.addIssue({
    code: 'custom',
    path: ['mcpLabels'],
    message: 'Only MCP posts may use MCP labels.'
  });
}
```

Export `type McpLabel = (typeof mcpLabels)[number]`.

- [ ] **Step 4: Replace site taxonomy configuration**

In `src/config/site.ts`, remove `learningPathConfig`, Buttondown, and Giscus configuration. Export:

```ts
export const topicConfig = {
  'openshift-lightspeed': {
    label: 'OpenShift Lightspeed',
    description: 'AI-assisted help for understanding and operating OpenShift.'
  },
  'agentic-lightspeed': {
    label: 'Agentic Lightspeed',
    description: 'Agentic workflows that connect reasoning, tools, and platform context.'
  },
  mcp: {
    label: 'MCP',
    description: 'Model Context Protocol servers, gateways, and lifecycle operations.'
  }
} satisfies Record<Topic, { label: string; description: string }>;

export const mcpLabelConfig: Record<McpLabel, string> = {
  'mcp-gateway': 'MCP Gateway',
  'mcp-server': 'MCP Server',
  'mcp-lifecycle-operator': 'MCP Lifecycle Operator'
};
```

- [ ] **Step 5: Remove learning-path query functions and migrate content truthfully**

Delete `getLearningPathGroups()` and `getPathNeighbors()` from `src/lib/posts.ts` and their tests. Add:

```ts
export function getRelatedPosts(posts: Post[], currentId: string, limit = 3) {
  const current = posts.find((post) => post.id === currentId);
  if (!current) return [];
  return sortNewest(posts)
    .filter((post) => post.id !== currentId && post.data.topic === current.data.topic)
    .slice(0, limit);
}
```

Migrate the published reading guide to `topic: openshift-lightspeed`, add `mcpLabels: []`, remove `learningPath`, and replace its “Use the learning path” section with “Choose a topic” text that directs readers to the three topic pages. Keep it a guide and do not add tested-version claims.

Migrate the draft lab to `topic: mcp`, `mcpLabels: [mcp-server]`, remove `learningPath`, and preserve every statement that it is unverified.

- [ ] **Step 6: Verify and commit the taxonomy**

Run:

```bash
npm test -- tests/content-schema.test.ts src/lib/posts.test.ts tests/draft-output.test.ts
npm run check
```

Expected: all targeted tests PASS and Astro reports zero errors.

```bash
git add src/content.config.ts src/config/site.ts src/lib/posts.ts src/lib/posts.test.ts src/lib/post-collection.ts src/content/posts tests/content-schema.test.ts tests/draft-output.test.ts
git commit -m "refactor: focus content on Lightspeed and MCP"
```

---

### Task 2: Build the RHDS editorial-minimal shell and topic routes

**Files:**
- Rewrite: `src/styles/global.css`
- Modify: `src/layouts/BaseLayout.astro`
- Rewrite: `src/components/Header.astro`
- Rewrite: `src/components/Footer.astro`
- Rewrite: `src/components/PostCard.astro`
- Rewrite: `src/pages/index.astro`
- Create: `src/pages/topics/[topic].astro`
- Modify: `src/pages/about.astro`
- Modify: `public/social-default.svg`
- Delete: `src/components/TerminalStatus.astro`
- Delete: `src/components/TopicRail.astro`

**Interfaces:**
- Consumes: `siteConfig`, `topicConfig`, `mcpLabelConfig`, `withBase(path)`, `sortNewest(posts)`, and `isPublished(post, mode)`.
- Produces: the minimal global shell, `/`, `/topics/<topic>/`, `/about/`, and base-path-safe shared navigation.

- [ ] **Step 1: Add structural browser tests before rewriting UI**

Replace workbench-specific assertions in `tests/site.spec.ts` with:

```ts
test('home exposes exactly the three primary topic links', async ({ page }) => {
  await page.goto('/');
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: 'OpenShift Lightspeed' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Agentic Lightspeed' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'MCP' })).toBeVisible();
  await expect(page.getByText('Learning paths')).toHaveCount(0);
  await expect(page.getByText(/newsletter/i)).toHaveCount(0);
});

test('every topic route has a title and article or empty state', async ({ page }) => {
  for (const slug of ['openshift-lightspeed', 'agentic-lightspeed', 'mcp']) {
    await page.goto(`/topics/${slug}/`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-topic-article-list], [data-topic-empty]')).toBeVisible();
  }
});

test('site identifies itself as personal and unofficial', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByText(/Li is a Technical Marketing Manager focused on Applied AI in OpenShift/i)).toBeVisible();
  await expect(page.getByText(/not an official Red Hat website/i)).toBeVisible();
});
```

- [ ] **Step 2: Run structural tests and confirm they fail**

Run: `npm run test:e2e -- tests/site.spec.ts`

Expected: FAIL because the topic routes do not exist and the current home still renders Learning paths/newsletter/workbench UI.

- [ ] **Step 3: Replace the visual foundation**

Rewrite `src/styles/global.css` around these semantic tokens:

```css
:root {
  --rh-red: #ee0000;
  --rh-red-hover: #a60000;
  --text-primary: #151515;
  --text-secondary: #4f5255;
  --border: #d2d2d2;
  --surface-subtle: #f2f2f2;
  --surface: #ffffff;
  --link: #0066cc;
  --font-heading: RedHatDisplay, "Red Hat Display", Helvetica, Arial, sans-serif;
  --font-body: RedHatText, "Red Hat Text", Helvetica, Arial, sans-serif;
  --font-mono: RedHatMono, "Red Hat Mono", "SFMono-Regular", Consolas, monospace;
  --page-max: 71rem;
  --reading-max: 49.3125rem;
}

* { box-sizing: border-box; }
html { color: var(--text-primary); background: var(--surface); font-family: var(--font-body); }
body { margin: 0; line-height: 1.5; }
body::before { display: block; height: 4px; background: var(--rh-red); content: ""; }
a { color: var(--link); text-decoration: underline; text-underline-offset: .18em; }
a:hover { color: var(--rh-red-hover); }
:focus-visible { outline: 3px solid var(--link); outline-offset: 3px; }
.shell { width: min(calc(100% - 64px), var(--page-max)); margin-inline: auto; }
.reading-column { width: min(100%, var(--reading-max)); }
.section { padding-block: 64px; }
@media (max-width: 47.99rem) {
  .shell { width: calc(100% - 32px); }
  .section { padding-block: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
```

Add only the focused classes required by Header, Footer, article rows, topic rows, search, and article reading layout. Do not restore gradients, shadows, uppercase UI labels, or card grids.

- [ ] **Step 4: Add base-path helper and minimal header/footer**

In `src/config/site.ts`, add:

```ts
export function withBase(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}
```

Header navigation must use `withBase()` for the brand, three topic pages, About, and Articles/Search. Use a native button with `aria-expanded`, `aria-controls`, and a short inline script for the mobile menu. The menu closes on Escape and when a link is chosen.

Footer contains only the personal/unofficial statement plus base-safe links to About and RSS.

- [ ] **Step 5: Build homepage, topic routes, and About**

Homepage content order is exact:

```text
Applied AI on OpenShift
Learn by building.
Practical notes on OpenShift Lightspeed, agentic systems, and MCP.

Topics
OpenShift Lightspeed
Agentic Lightspeed
MCP — MCP Gateway · MCP Server · MCP Lifecycle Operator

Newest articles
```

Use simple bordered rows, not cards. Show up to five newest posts.

`src/pages/topics/[topic].astro` must use `getStaticPaths()` over `topics`, filter posts using the current build mode, and render the exact empty state `Articles are coming.` when no post matches.

About copy must include: `Li is a Technical Marketing Manager focused on Applied AI in OpenShift.` and the existing personal/unofficial disclaimer. Do not add biography facts not approved in the specification.

- [ ] **Step 6: Simplify social artwork and verify the shell**

Replace `public/social-default.svg` with a 1200×630 white canvas, a 12px red top rule, `AI Runs Here`, `Applied AI on OpenShift`, and the three topic names in black/gray text. Do not include the Red Hat logo.

Run:

```bash
npm run check
npm run build
npm run test:e2e -- tests/site.spec.ts
```

Expected: topic routes build; structural browser tests pass; Astro reports zero errors.

```bash
git add src/styles/global.css src/layouts/BaseLayout.astro src/components/Header.astro src/components/Footer.astro src/components/PostCard.astro src/pages/index.astro src/pages/topics src/pages/about.astro public/social-default.svg
git rm src/components/TerminalStatus.astro src/components/TopicRail.astro
git commit -m "feat: add minimal Red Hat editorial shell"
```

---

### Task 3: Simplify article discovery and reading; remove dormant features

**Files:**
- Rewrite: `src/components/SearchPanel.astro`
- Modify: `src/pages/articles/index.astro`
- Modify: `src/pages/articles/[id].astro`
- Rewrite: `src/layouts/PostLayout.astro`
- Modify: `src/pages/rss.xml.ts`
- Modify: `tests/site.spec.ts`
- Modify: `src/components/progressive-enhancement.test.ts`
- Delete: `src/components/NewsletterForm.astro`
- Delete: `src/components/GiscusComments.astro`
- Delete: `src/pages/learning-paths/index.astro`

**Interfaces:**
- Consumes: `withBase()`, `topicConfig`, `mcpLabelConfig`, `getRelatedPosts()`, and the Pagefind article artifact.
- Produces: a one-input `/articles/` search, minimal `/articles/<id>/` pages, RSS URLs safe under a base path, and no removed integrations/routes.

- [ ] **Step 1: Replace removed-feature and search tests**

Delete Giscus, Buttondown, filter-select, and Learning paths assertions. Add:

```ts
test('articles page exposes one search input and no advanced filters', async ({ page }) => {
  await page.goto('/articles/');
  await expect(page.getByLabel('Search articles')).toBeVisible();
  await expect(page.getByLabel('Topic')).toHaveCount(0);
  await expect(page.getByLabel('Difficulty')).toHaveCount(0);
});

test('search returns article metadata and can be cleared', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('evidence');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByText('OpenShift Lightspeed')).toBeVisible();
  await page.getByLabel('Search articles').clear();
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
});

test('removed routes and integrations are absent', async ({ request, page }) => {
  expect((await request.get('/learning-paths/')).status()).toBe(404);
  await page.goto('/');
  await expect(page.locator('form[action*="buttondown"]')).toHaveCount(0);
  await page.goto('/articles/start-learning-applied-ai-on-openshift/');
  await expect(page.locator('script[src*="giscus"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Confirm red state**

Run: `npm run test:e2e -- tests/site.spec.ts`

Expected: FAIL because search still contains selects and the removed integrations/routes still exist.

- [ ] **Step 3: Rewrite SearchPanel as a one-input component**

Render only:

```astro
<section class="search" data-search-panel aria-labelledby="search-title">
  <h2 id="search-title">Search articles</h2>
  <label>
    <span class="visually-hidden">Search articles</span>
    <input type="search" name="q" placeholder="Search by title or keyword" autocomplete="off" />
  </label>
  <p data-search-summary aria-live="polite">Browse all articles below.</p>
  <ol data-search-results hidden></ol>
</section>
```

Keep the existing 150ms debounce and stale-request guard. Call `pagefind.search(query)` only for a nonblank query. Render title, description, topic, date, and MCP labels with DOM APIs. Use `new URL('pagefind/pagefind.js', document.baseURI)` for the dynamic import so repository subpaths work. Empty copy is `No articles match your search.`; import failure copy is `Search is unavailable. Browse all articles below.`

- [ ] **Step 4: Simplify article index and article layout**

Articles page renders one modest page title, SearchPanel, then a one-column chronological list.

PostLayout removes Giscus, path neighbors, dark register panel, uppercase headings, and workbench language. Keep tested versions, prerequisites, TOC, article body, code copy, and related posts. Render MCP labels beneath the primary topic when present.

`src/pages/articles/[id].astro` no longer computes learning-path neighbors. It passes only `{ post, headings }` to PostLayout.

Base-path-prefix every internal article, related-post, TOC, RSS, and asset link with `withBase()`. Fragment-only TOC links remain fragment-only.

- [ ] **Step 5: Delete removed features and clean progressive tests**

Delete NewsletterForm, GiscusComments, and the Learning paths page. Remove their imports, environment variables, CSS, unit tests, Playwright routing, and copy. Keep only mobile-menu, Pagefind, and code-copy progressive tests.

- [ ] **Step 6: Verify and commit the reading experience**

Run:

```bash
npm test
npm run check
npm run build
npm run check:links
npm run test:e2e
```

Expected: all tests pass; `/learning-paths/` is absent; articles/search/article routes work; no removed integration strings appear in `dist/`.

```bash
git add src/components/SearchPanel.astro src/pages/articles src/layouts/PostLayout.astro src/pages/rss.xml.ts tests/site.spec.ts src/components/progressive-enhancement.test.ts
git rm src/components/NewsletterForm.astro src/components/GiscusComments.astro src/pages/learning-paths/index.astro
git commit -m "refactor: simplify article reading and search"
```

---

### Task 4: Replace Vercel with GitHub Pages and verify base paths

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/config/site-url.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scripts/build-pagefind.mjs`
- Modify: `playwright.config.ts`
- Modify: `tests/review-regressions.test.ts`
- Create: `.github/workflows/deploy-pages.yml`
- Delete: `scripts/sync-pagefind-to-vercel.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `resolveSiteUrl(value, { production })`, `resolveBasePath(value)`, a static `dist/` artifact, Pagefind under the configured base, and the GitHub Pages workflow.
- Consumes: GitHub Actions `github.repository_owner`, repository name, optional repository variables `SITE_URL` and `BASE_PATH`.

- [ ] **Step 1: Write site/base configuration tests**

Add to `tests/review-regressions.test.ts`:

```ts
import { resolveBasePath } from '../src/config/site-url.mjs';

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
```

- [ ] **Step 2: Confirm base-path tests fail**

Run: `npm test -- tests/review-regressions.test.ts`

Expected: FAIL because `resolveBasePath` is not exported.

- [ ] **Step 3: Implement static Astro configuration**

In `src/config/site-url.mjs`, export:

```js
export function resolveBasePath(value) {
  const raw = value?.trim() || '/';
  if (raw.includes('?') || raw.includes('#') || raw.includes('..') || raw.startsWith('//')) {
    throw new Error('PUBLIC_BASE_PATH must be a root-relative GitHub Pages base path.');
  }
  const segment = raw.replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
}
```

In `astro.config.mjs`, remove the Vercel import and adapter, then configure:

```js
const production = isProductionBuild();
export default defineConfig({
  site: resolveSiteUrl(process.env.PUBLIC_SITE_URL, { production }),
  base: resolveBasePath(process.env.PUBLIC_BASE_PATH),
  output: 'static',
  integrations: [mdx(), sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } }
});
```

- [ ] **Step 4: Remove Vercel dependencies/scripts and make Pagefind base-aware**

Run: `npm uninstall @astrojs/vercel`

Delete `sync-pagefind-to-vercel.mjs` and `check:deployment-artifact`. Change scripts to:

```json
{
  "build": "astro check && astro build && node scripts/build-pagefind.mjs",
  "verify": "npm run test && npm run build && npm run check:links && npm run test:e2e"
}
```

Update `build-pagefind.mjs` to find article detail HTML under either `dist/articles/*/index.html` or `dist/<base>/articles/*/index.html`, write Pagefind next to the built site's root, and assert its URLs include the configured base exactly once. Export the path-resolution function and cover it with Vitest fixtures.

- [ ] **Step 5: Add the GitHub Pages workflow**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    env:
      PUBLIC_SITE_URL: ${{ vars.SITE_URL || format('https://{0}.github.io', github.repository_owner) }}
      PUBLIC_BASE_PATH: ${{ vars.BASE_PATH || format('/{0}/', github.event.repository.name) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run verify
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Add root and subpath browser projects**

Update Playwright to build once per invocation using supplied `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH`. Add test projects or two documented commands that verify:

```bash
PUBLIC_SITE_URL=https://example.github.io PUBLIC_BASE_PATH=/ai-runs-here/ PLAYWRIGHT_BASE_PATH=/ai-runs-here/ npm run test:e2e
PUBLIC_SITE_URL=https://blog.example.com PUBLIC_BASE_PATH=/ PLAYWRIGHT_BASE_PATH=/ npm run test:e2e
```

Tests must derive page URLs from `PLAYWRIGHT_BASE_PATH` and confirm header, topic, article, RSS, sitemap, Pagefind import, and internal links resolve under both configurations.

- [ ] **Step 7: Verify and commit deployment migration**

Run:

```bash
npm test
PUBLIC_SITE_URL=https://example.github.io PUBLIC_BASE_PATH=/ai-runs-here/ npm run build
npm run check:links
PUBLIC_SITE_URL=https://blog.example.com PUBLIC_BASE_PATH=/ npm run build
npm run check:links
```

Expected: both builds pass; Pagefind exists; no `@astrojs/vercel`, `.vercel`, Buttondown, or Giscus strings remain in tracked runtime/config files.

```bash
git add astro.config.mjs src/config/site-url.mjs package.json package-lock.json scripts/build-pagefind.mjs playwright.config.ts tests/review-regressions.test.ts .github/workflows/deploy-pages.yml .gitignore
git rm scripts/sync-pagefind-to-vercel.mjs
git commit -m "build: deploy static blog with GitHub Pages"
```

---

### Task 5: Rewrite author documentation and complete release verification

**Files:**
- Rewrite: `README.md`
- Modify: `.env.example`
- Modify: `tests/site.spec.ts`
- Modify: `tests/review-regressions.test.ts`
- Modify: `scripts/check-links.mjs` only if subpath tests reveal a bug

**Interfaces:**
- Consumes: complete root/subpath build and all public authoring interfaces.
- Produces: concise author guide, verified GitHub Pages workflow, and final release evidence.

- [ ] **Step 1: Write a stale-documentation test**

Add a Vitest test that reads tracked source/config/documentation files and asserts removed platform terms are absent from runtime/docs:

```ts
it('contains no removed deployment or integration instructions', async () => {
  const files = ['README.md', 'package.json', '.env.example', 'astro.config.mjs'];
  const text = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  expect(text).not.toMatch(/Vercel|Buttondown|Giscus|Learning paths/i);
});
```

The historical design/plan documents are excluded from this assertion because they intentionally record decisions.

- [ ] **Step 2: Confirm stale-documentation test fails**

Run: `npm test -- tests/review-regressions.test.ts`

Expected: FAIL because README and `.env.example` still document removed services.

- [ ] **Step 3: Rewrite README as a minimal operating guide**

README sections are exactly:

1. Purpose and personal/unofficial disclaimer
2. Requirements and local setup
3. Content topics and MCP labels
4. Frontmatter template with `mcpLabels`
5. Create, preview, publish, update, return-to-draft, and delete workflows
6. Images and tested-version truthfulness
7. Local verification
8. GitHub Pages project-site deployment
9. Optional custom-domain configuration using repository variables `SITE_URL` and `BASE_PATH=/`
10. Rollback with `git revert`

Remove all Vercel, Buttondown, Giscus, newsletter, comments, and Learning paths instructions.

`.env.example` contains only:

```dotenv
PUBLIC_SITE_URL=https://username.github.io
PUBLIC_BASE_PATH=/repository-name/
```

- [ ] **Step 4: Expand final browser verification**

The final `tests/site.spec.ts` must cover:

- Header and mobile menu
- Exactly three topic links and all topic routes
- Topic empty state
- One-input search success, empty, clear, import failure, and no-JavaScript list
- Published article and draft exclusion
- About identity/disclaimer
- RSS and sitemap
- Removed Learning paths route returns 404
- No newsletter or Giscus script/form
- Keyboard skip link and visible focus
- Axe on home, articles, all topics, About, and one article
- 320px long prose/code containment
- No horizontal overflow at 320, 390, 768, 1280, and 1600px
- Root and repository-subpath builds

- [ ] **Step 5: Run the fresh final gate**

Run the root-domain gate:

```bash
PUBLIC_SITE_URL=https://blog.example.com PUBLIC_BASE_PATH=/ PLAYWRIGHT_BASE_PATH=/ npm run verify
```

Run the GitHub project-site gate:

```bash
PUBLIC_SITE_URL=https://example.github.io PUBLIC_BASE_PATH=/ai-runs-here/ PLAYWRIGHT_BASE_PATH=/ai-runs-here/ npm run verify
```

Expected for both:

- Vitest: all tests PASS
- Astro: zero errors, warnings, or hints
- Build: PASS
- Pagefind: article-only artifact present and searchable
- Link checker: PASS, including fragments and encoded paths
- Playwright desktop/mobile: all tests PASS
- Axe: no serious or critical violations
- No horizontal overflow

- [ ] **Step 6: Perform visual review and commit**

Inspect homepage, one empty topic, Articles, About, and one article at 320px, 768px, 1280px, and 1600px. Confirm the design uses white space, sentence case, thin gray rules, restrained red, underlined links, and no removed feature remnants.

```bash
git add README.md .env.example tests/site.spec.ts tests/review-regressions.test.ts scripts/check-links.mjs
git commit -m "docs: document minimal GitHub Pages workflow"
```

---

## Final Release Gate

- [ ] Run `git status --short`; expected output is empty.
- [ ] Run `git grep -Ei 'buttondown|giscus|vercel|learning paths' -- ':!docs/superpowers/**'`; expected output is empty.
- [ ] Run the root-domain verification gate and save its test totals.
- [ ] Run the repository-subpath verification gate and save its test totals.
- [ ] Confirm `.github/workflows/deploy-pages.yml` uploads `dist/` only after verification.
- [ ] Confirm the final production preview contains no Red Hat logo and retains the personal/unofficial disclaimer.
