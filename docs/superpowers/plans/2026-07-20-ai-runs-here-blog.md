# AI Runs Here Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a deployable Astro blog named “AI Runs Here” for publishing Markdown/MDX labs and explanations about Applied AI on OpenShift.

**Architecture:** Astro produces a static site from a typed `posts` content collection. Focused utilities own content querying and learning-path relationships; Astro layouts and components own rendering; Pagefind indexes rendered article HTML after the build. Buttondown and Giscus remain replaceable external integrations configured through public environment variables.

**Tech Stack:** Node.js 22 LTS, npm, Astro 5+, TypeScript, MDX, Astro Content Collections, Pagefind 1.5+, Giscus client embed, Buttondown HTML endpoint, Vitest, Playwright, axe-core.

## Global Constraints

- Title is `AI Runs Here`; subtitle is `Applied AI on OpenShift`.
- Editorial promise is “Tested labs, useful diagrams, and honest notes from the terminal.”
- Site is personal and unofficial; it must not imply it is an official Red Hat publication.
- Palette uses `#143E33`, `#C9F36A`, `#F1F6F1`, `#E5EEE6`, `#9DB4A6`, and `#FFFFFF`.
- Drafts must be excluded from production pages, search, RSS, and sitemap.
- No custom database, user accounts, analytics tracker, or custom admin dashboard.
- Giscus and Buttondown failures must not make articles unreadable.
- All controls require visible keyboard focus; motion must respect `prefers-reduced-motion`.
- Dependencies must use actively supported releases compatible with Node.js 22 at implementation time.
- `.superpowers/` is local brainstorming state and must remain untracked.

---

## File Map

```text
astro.config.mjs                     Astro, MDX, sitemap, site URL, and Vercel configuration
package.json                         Commands and dependencies
tsconfig.json                        Strict Astro TypeScript settings
vitest.config.ts                     Unit-test configuration
playwright.config.ts                 Responsive and accessibility browser-test configuration
.env.example                         Documented public integration variables
.gitignore                           Build, dependency, environment, and brainstorming exclusions
src/content.config.ts                Post schema and controlled topic/difficulty values
src/content/posts/*.mdx              Versioned source articles
src/config/site.ts                   Brand, navigation, topics, paths, and environment parsing
src/lib/posts.ts                     Published-post queries and learning-path relationships
src/lib/posts.test.ts                Query and relationship unit tests
src/layouts/BaseLayout.astro         Global document, metadata, header, footer, and assets
src/layouts/PostLayout.astro         Article metadata, TOC, body, related links, and comments
src/components/Header.astro          Responsive primary navigation
src/components/Footer.astro          Personal-site disclaimer and secondary links
src/components/TerminalStatus.astro  Verified current-experiment signature element
src/components/PostCard.astro        Reusable article summary card
src/components/TopicRail.astro       Topic entry points
src/components/NewsletterForm.astro  Buttondown form and client-side status handling
src/components/GiscusComments.astro  Optional comments embed and unavailable state
src/components/SearchPanel.astro     Pagefind search and filter controls
src/components/CodeCopy.astro        Progressive copy-code behavior
src/styles/global.css                Approved tokens, typography, layout, focus, and motion
src/pages/index.astro                Homepage
src/pages/articles/index.astro       Searchable article index
src/pages/articles/[id].astro        Static article routes
src/pages/learning-paths/index.astro Published learning-path index
src/pages/about.astro                Author approach and unofficial-site statement
src/pages/rss.xml.ts                 Published-post RSS feed
tests/content-schema.test.ts         Schema acceptance and rejection tests
tests/draft-output.test.ts           Production draft-exclusion test
tests/site.spec.ts                   Responsive, navigation, search, and accessibility tests
scripts/check-links.mjs              Internal-link checker for built output
README.md                            Authoring, integration, testing, and Vercel guide
```

---

### Task 1: Create the Astro foundation and validated content contract

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/content.config.ts`
- Create: `src/config/site.ts`
- Create: `tests/content-schema.test.ts`

**Interfaces:**
- Produces: `posts` content collection; `Topic`, `Difficulty`, `siteConfig`, `topicConfig`, `learningPathConfig`, and `getPublicIntegrationConfig()`.
- Consumes: no application interfaces.

- [ ] **Step 1: Add dependency and command manifests**

Create `package.json`:

```json
{
  "name": "ai-runs-here",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && pagefind --site dist",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check:links": "node scripts/check-links.mjs",
    "verify": "npm run test && npm run build && npm run check:links && npm run test:e2e"
  }
}
```

Run:

```bash
npm install astro @astrojs/check @astrojs/mdx @astrojs/rss @astrojs/sitemap @astrojs/vercel pagefind zod
npm install --save-dev typescript vitest @playwright/test @axe-core/playwright cheerio
```

Expected: `package-lock.json` is created and `npm audit` reports no unresolved critical vulnerability. If the supported Astro release requires a newer Node version, stop and update the documented Node requirement before continuing.

- [ ] **Step 2: Write schema tests before the schema**

Create `tests/content-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { postSchema } from '../src/content.config';

const validPost = {
  title: 'Connect an MCP server to OpenShift Lightspeed',
  description: 'A tested path from deployment to a verified Lightspeed query.',
  publishedDate: new Date('2026-07-20'),
  topic: 'mcp',
  tags: ['lightspeed', 'gateway'],
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  testedVersions: ['OpenShift Container Platform 4.20'],
  prerequisites: ['Cluster-admin access'],
  draft: false,
  featured: true,
  learningPath: { id: 'mcp', order: 1 }
};

describe('postSchema', () => {
  it('accepts complete tested lab metadata', () => {
    expect(postSchema.safeParse(validPost).success).toBe(true);
  });

  it.each([
    [{ ...validPost, estimatedMinutes: 0 }, 'non-positive duration'],
    [{ ...validPost, difficulty: 'easy' }, 'uncontrolled difficulty'],
    [{ ...validPost, testedVersions: [] }, 'missing tested version']
  ])('rejects %s', (input) => {
    expect(postSchema.safeParse(input).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the schema test and verify the red state**

Run: `npm test -- tests/content-schema.test.ts`

Expected: FAIL because `src/content.config.ts` does not exist.

- [ ] **Step 4: Implement the collection schema and controlled values**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const topics = ['openshift-ai', 'agentic-ai', 'mcp', 'lightspeed'] as const;
export const difficulties = ['beginner', 'intermediate', 'advanced'] as const;

export const postSchema = z.object({
  title: z.string().min(8),
  description: z.string().min(20).max(180),
  publishedDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  topic: z.enum(topics),
  tags: z.array(z.string().min(1)).default([]),
  difficulty: z.enum(difficulties),
  estimatedMinutes: z.number().int().positive(),
  testedVersions: z.array(z.string().min(3)).min(1),
  prerequisites: z.array(z.string().min(3)).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  learningPath: z.object({
    id: z.enum(['start-openshift-ai', 'agentic-ai', 'mcp']),
    order: z.number().int().positive()
  }).optional(),
  image: z.string().optional()
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: postSchema
});

export const collections = { posts };
export type Topic = typeof topics[number];
export type Difficulty = typeof difficulties[number];
```

- [ ] **Step 5: Add stable site configuration**

Create `src/config/site.ts`:

```ts
import type { Topic } from '../content.config';

export const siteConfig = {
  title: 'AI Runs Here',
  subtitle: 'Applied AI on OpenShift',
  description: 'Tested labs, useful diagrams, and honest notes from the terminal.',
  navigation: [
    { label: 'Articles', href: '/articles/' },
    { label: 'Learning paths', href: '/learning-paths/' },
    { label: 'About', href: '/about/' }
  ]
} as const;

export const topicConfig: Record<Topic, { label: string; description: string }> = {
  'openshift-ai': { label: 'OpenShift AI', description: 'Models, serving, and pipelines' },
  'agentic-ai': { label: 'Agentic AI', description: 'Agents and orchestration' },
  mcp: { label: 'MCP', description: 'Servers and gateways' },
  lightspeed: { label: 'Lightspeed', description: 'AI-assisted operations' }
};

export const learningPathConfig = {
  'start-openshift-ai': { label: 'Start with OpenShift AI', description: 'Build a practical foundation.' },
  'agentic-ai': { label: 'Agentic AI', description: 'Move from model calls to agents.' },
  mcp: { label: 'MCP', description: 'Connect tools, servers, and gateways.' }
} as const;

export function getPublicIntegrationConfig(env: Record<string, string | undefined>) {
  return {
    siteUrl: env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
    buttondownUsername: env.PUBLIC_BUTTONDOWN_USERNAME ?? '',
    giscus: {
      repo: env.PUBLIC_GISCUS_REPO ?? '',
      repoId: env.PUBLIC_GISCUS_REPO_ID ?? '',
      category: env.PUBLIC_GISCUS_CATEGORY ?? 'Announcements',
      categoryId: env.PUBLIC_GISCUS_CATEGORY_ID ?? ''
    }
  };
}
```

Create `.env.example`:

```dotenv
PUBLIC_SITE_URL=https://example.com
PUBLIC_BUTTONDOWN_USERNAME=your-buttondown-username
PUBLIC_GISCUS_REPO=owner/public-repository
PUBLIC_GISCUS_REPO_ID=repository-id-from-giscus
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=category-id-from-giscus
```

- [ ] **Step 6: Configure Astro, TypeScript, tests, and ignored state**

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } }
});
```

Create `tsconfig.json`:

```json
{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] } });
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.vercel/
.env
.env.*
!.env.example
playwright-report/
test-results/
.superpowers/
```

- [ ] **Step 7: Verify and commit the foundation**

Run: `npm test -- tests/content-schema.test.ts && npm run check`

Expected: schema tests PASS and Astro check reports zero errors.

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore .env.example src/content.config.ts src/config/site.ts tests/content-schema.test.ts
git commit -m "build: establish Astro content foundation"
```

---

### Task 2: Implement content queries, relationships, and a representative lab

**Files:**
- Create: `src/lib/posts.ts`
- Create: `src/lib/posts.test.ts`
- Create: `src/content/posts/connect-mcp-server-to-lightspeed.mdx`

**Interfaces:**
- Consumes: Astro `CollectionEntry<'posts'>`, `learningPathConfig`.
- Produces: `isPublished(post, mode)`, `sortNewest(posts)`, `getFeaturedPost(posts)`, `getLearningPathGroups(posts)`, and `getPathNeighbors(posts, currentId)`.

- [ ] **Step 1: Write query behavior tests**

Create `src/lib/posts.test.ts` using small typed fixtures and these assertions:

```ts
import { describe, expect, it } from 'vitest';
import { getPathNeighbors, isPublished, sortNewest } from './posts';

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  data: {
    title: id,
    description: `A complete description for ${id}`,
    publishedDate: new Date('2026-01-01'),
    topic: 'mcp', tags: [], difficulty: 'beginner', estimatedMinutes: 10,
    testedVersions: ['OpenShift 4.20'], prerequisites: [], draft: false, featured: false,
    ...overrides
  }
}) as never;

describe('post queries', () => {
  it('hides drafts only in production', () => {
    const draft = post('draft', { draft: true });
    expect(isPublished(draft, 'production')).toBe(false);
    expect(isPublished(draft, 'development')).toBe(true);
  });

  it('sorts updated or published dates newest first', () => {
    const older = post('older');
    const newer = post('newer', { updatedDate: new Date('2026-05-01') });
    expect(sortNewest([older, newer]).map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('returns ordered neighbors only within the same path', () => {
    const first = post('first', { learningPath: { id: 'mcp', order: 1 } });
    const second = post('second', { learningPath: { id: 'mcp', order: 2 } });
    const third = post('third', { learningPath: { id: 'mcp', order: 3 } });
    expect(getPathNeighbors([third, first, second], 'second')).toEqual({ previous: first, next: third });
  });
});
```

- [ ] **Step 2: Run tests and verify the red state**

Run: `npm test -- src/lib/posts.test.ts`

Expected: FAIL because `src/lib/posts.ts` does not exist.

- [ ] **Step 3: Implement focused post-query utilities**

Create `src/lib/posts.ts`:

```ts
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type BuildMode = 'development' | 'production';

const effectiveDate = (post: Post) => post.data.updatedDate ?? post.data.publishedDate;

export function isPublished(post: Post, mode: BuildMode) {
  return mode === 'development' || !post.data.draft;
}

export function sortNewest(posts: Post[]) {
  return [...posts].sort((a, b) => effectiveDate(b).getTime() - effectiveDate(a).getTime());
}

export function getFeaturedPost(posts: Post[]) {
  return sortNewest(posts).find((post) => post.data.featured) ?? sortNewest(posts)[0];
}

export function getLearningPathGroups(posts: Post[]) {
  return posts.filter((post) => post.data.learningPath).reduce((groups, post) => {
    const id = post.data.learningPath!.id;
    groups.set(id, [...(groups.get(id) ?? []), post]);
    return groups;
  }, new Map<string, Post[]>());
}

export function getPathNeighbors(posts: Post[], currentId: string) {
  const current = posts.find((post) => post.id === currentId);
  if (!current?.data.learningPath) return { previous: undefined, next: undefined };
  const ordered = posts
    .filter((post) => post.data.learningPath?.id === current.data.learningPath?.id)
    .sort((a, b) => a.data.learningPath!.order - b.data.learningPath!.order);
  const index = ordered.findIndex((post) => post.id === currentId);
  return { previous: ordered[index - 1], next: ordered[index + 1] };
}
```

- [ ] **Step 4: Add a representative MDX lab**

Create `src/content/posts/connect-mcp-server-to-lightspeed.mdx` with valid frontmatter and these complete teaching sections:

```mdx
---
title: Connect an MCP server to OpenShift Lightspeed
description: Follow a version-aware workflow from prerequisites through a verified OpenShift Lightspeed query.
publishedDate: 2026-07-20
topic: mcp
tags: [lightspeed, mcp-server, troubleshooting]
difficulty: intermediate
estimatedMinutes: 20
testedVersions: [OpenShift Container Platform 4.20]
prerequisites: [Access to an OpenShift cluster, The oc CLI, Permission to inspect the target namespace]
draft: false
featured: true
learningPath:
  id: mcp
  order: 1
---

## What you will learn

This lab shows the shape of a trustworthy MCP-to-Lightspeed workflow: check the environment, connect the service, issue a query, and preserve evidence of what worked.

> This sample demonstrates the blog format. Replace its illustrative commands with commands verified against the exact lab environment before presenting it as a production procedure.

## Prerequisites

Confirm that `oc whoami` returns the expected user and that you are working in the intended cluster context.

```bash
oc whoami
oc project
```

## Inspect the workload

List the workloads in the namespace used by your experiment.

```bash
oc get pods -n redhat-ods-applications
```

## Verify the result

Record the command output, cluster version, operator versions, and the time of the test. A useful lab distinguishes observed results from expected results.

## Troubleshooting

If the query fails, check authentication, route reachability, service endpoints, and pod logs in that order. Preserve the first concrete error before changing the environment.

## References

- [OpenShift product documentation](https://docs.redhat.com/en/documentation/openshift_container_platform/)
```

- [ ] **Step 5: Run tests and commit the content layer**

Run: `npm test -- src/lib/posts.test.ts && npm run check`

Expected: all post-query tests PASS and the sample MDX frontmatter validates.

```bash
git add src/lib/posts.ts src/lib/posts.test.ts src/content/posts/connect-mcp-server-to-lightspeed.mdx
git commit -m "feat: add typed blog content workflow"
```

---

### Task 3: Build the approved visual system and shared shell

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/components/TerminalStatus.astro`
- Create: `src/components/PostCard.astro`
- Create: `src/components/TopicRail.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/about.astro`

**Interfaces:**
- Consumes: `siteConfig`, `topicConfig`, `Post`, and post-query utilities.
- Produces: `BaseLayout` props `{ title, description, image?, article? }`, reusable post/topic components, and the `/` and `/about/` routes.

- [ ] **Step 1: Implement tokens, typography, focus, and responsive primitives**

Create `src/styles/global.css` with the approved custom properties and required baseline:

```css
:root {
  --cluster: #143e33; --signal: #c9f36a; --paper: #f1f6f1;
  --wash: #e5eee6; --rule: #9db4a6; --white: #fff;
  --ink-muted: #496a5e; --content: 72rem;
  --font-display: "Arial Narrow", "Roboto Condensed", sans-serif;
  --font-body: Inter, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, monospace;
}
* { box-sizing: border-box; }
html { color: var(--cluster); background: var(--paper); font-family: var(--font-body); }
body { margin: 0; line-height: 1.6; }
a { color: inherit; text-underline-offset: .2em; }
img { max-width: 100%; height: auto; }
:focus-visible { outline: 3px solid var(--signal); outline-offset: 4px; }
.shell { width: min(100% - 2rem, var(--content)); margin-inline: auto; }
.eyebrow { font: 700 .72rem/1.2 var(--font-mono); letter-spacing: .12em; text-transform: uppercase; }
.display { font: 800 clamp(3.5rem, 9vw, 7.5rem)/.85 var(--font-display); letter-spacing: -.055em; text-transform: uppercase; }
.skip-link { position: fixed; left: 1rem; top: -5rem; z-index: 20; padding: .7rem 1rem; background: var(--signal); }
.skip-link:focus { top: 1rem; }
.site-header, .site-footer { border-block: 1px solid var(--rule); }
.site-nav { display: flex; align-items: center; justify-content: space-between; min-height: 4.5rem; gap: 2rem; }
.site-nav__links { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
.hero { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(18rem, .8fr); border-bottom: 1px solid var(--rule); }
.hero__main { padding: clamp(3rem, 8vw, 7rem) clamp(1.5rem, 5vw, 4rem); }
.hero__aside { padding: 2rem; border-left: 1px solid var(--rule); background: var(--wash); }
.terminal { padding: 1.25rem; color: var(--signal); background: var(--cluster); border-radius: .3rem; font-family: var(--font-mono); }
.topic-rail { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--rule); }
.topic-rail > a { padding: 1.25rem; border-right: 1px solid var(--rule); text-decoration: none; }
.post-grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 1rem; }
.post-card { padding: 1.25rem; border: 1px solid var(--rule); border-radius: .3rem; background: var(--white); }
.post-card--featured { background: var(--wash); }
.prose { width: min(100% - 2rem, 46rem); margin-inline: auto; }
.prose pre { max-width: 100%; overflow-x: auto; padding: 1rem; color: var(--paper); background: var(--cluster); }
.filter-row, .newsletter-form { display: flex; flex-wrap: wrap; gap: .75rem; }
.filter-row input, .filter-row select, .newsletter-form input, .newsletter-form button { min-height: 2.75rem; padding: .65rem .8rem; border: 1px solid var(--rule); }
@media (prefers-reduced-motion: no-preference) {
  .post-card { transition: transform 160ms ease, box-shadow 160ms ease; }
  .post-card:hover { transform: translateY(-3px); }
}
@media (max-width: 48rem) {
  .shell { width: min(100% - 1rem, var(--content)); }
  .site-nav__links { display: none; }
  .hero, .post-grid { grid-template-columns: 1fr; }
  .hero__aside { border-left: 0; border-top: 1px solid var(--rule); }
  .topic-rail { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Build the semantic document shell**

Create `src/layouts/BaseLayout.astro` with:

```astro
---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { siteConfig } from '../config/site';
import '../styles/global.css';
interface Props { title?: string; description?: string; image?: string; article?: boolean; }
const { title, description = siteConfig.description, image, article = false } = Astro.props;
const pageTitle = title ? `${title} · ${siteConfig.title}` : `${siteConfig.title} — ${siteConfig.subtitle}`;
const canonical = new URL(Astro.url.pathname, Astro.site);
const socialImage = image ? new URL(image, Astro.site) : new URL('/social-default.svg', Astro.site);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" type="application/rss+xml" title={siteConfig.title} href="/rss.xml" />
    <meta property="og:type" content={article ? 'article' : 'website'} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={socialImage} />
    <title>{pageTitle}</title>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main" tabindex="-1"><slot /></main>
    <Footer />
  </body>
</html>
```

Implement `Header.astro` and `Footer.astro` from `siteConfig.navigation`. The footer must state: “AI Runs Here is a personal learning publication and is not an official Red Hat website.”

- [ ] **Step 3: Build content-bearing homepage components**

Implement:

- `TerminalStatus.astro` with props `{ label: string; lines: string[]; verified: boolean }`; render “Verified” only when `verified` is true, otherwise render “Experiment in progress.”
- `PostCard.astro` with prop `{ post: Post; featured?: boolean }`; render topic, difficulty, minutes, title, and description with a full-card article link.
- `TopicRail.astro`; render all `topicConfig` values as links to `/articles/?topic=<id>`.

No component may contain fabricated success metrics or generic AI imagery.

- [ ] **Step 4: Assemble the homepage and About page**

In `src/pages/index.astro`, load posts using `getCollection('posts')`, filter with `isPublished(post, import.meta.env.PROD ? 'production' : 'development')`, select the feature with `getFeaturedPost`, and render:

1. Hero eyebrow `Applied AI on OpenShift · Field notes 001–∞`
2. Heading `Applied AI, step by step.`
3. The editorial promise
4. `TerminalStatus` with `verified={false}` until a real test result is supplied
5. `TopicRail`
6. Featured and recent `PostCard` entries
7. Newsletter component slot added in Task 6

In `src/pages/about.astro`, explain the learning-through-building method, audience, correction policy, and personal-site disclaimer without presenting unverified professional biography details.

- [ ] **Step 5: Verify and commit the shared experience**

Run: `npm run check && npm run build`

Expected: zero Astro errors; `/index.html` and `/about/index.html` exist in `dist/`; Pagefind completes without a fatal error.

```bash
git add src/styles src/layouts src/components/Header.astro src/components/Footer.astro src/components/TerminalStatus.astro src/components/PostCard.astro src/components/TopicRail.astro src/pages/index.astro src/pages/about.astro
git commit -m "feat: build Modern Lab Manual site shell"
```

---

### Task 4: Add article rendering, learning paths, and progressive code controls

**Files:**
- Create: `src/layouts/PostLayout.astro`
- Create: `src/components/CodeCopy.astro`
- Create: `src/components/GiscusComments.astro`
- Create: `src/pages/articles/[id].astro`
- Create: `src/pages/learning-paths/index.astro`

**Interfaces:**
- Consumes: `Post`, `getPathNeighbors`, `getLearningPathGroups`, integration config.
- Produces: all `/articles/<id>/` routes, published learning-path summaries, and resilient comments.

- [ ] **Step 1: Build static article routing**

Create `src/pages/articles/[id].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';
import { getPathNeighbors, isPublished, type Post } from '../../lib/posts';

export async function getStaticPaths() {
  const all = await getCollection('posts');
  const published = all.filter((post) => isPublished(post, 'production'));
  return published.map((post) => ({ params: { id: post.id }, props: { post, all: published } }));
}

const { post, all } = Astro.props as { post: Post; all: Post[] };
const { Content, headings } = await render(post);
const neighbors = getPathNeighbors(all, post.id);
---
<PostLayout post={post} headings={headings} neighbors={neighbors}>
  <Content />
</PostLayout>
```

- [ ] **Step 2: Implement the article contract**

`PostLayout.astro` must render:

- `BaseLayout` with article metadata
- Visible topic, difficulty, time, publish date, optional updated date
- Tested versions and prerequisites before the body
- TOC from depth-two and depth-three headings
- `<article data-pagefind-body>` with Pagefind topic and difficulty filters
- Previous/next path links when present
- Related posts from the same topic, excluding the current post
- `GiscusComments`
- `CodeCopy`

Use `aria-labelledby` for metadata panels and omit empty optional regions rather than displaying empty headings.

- [ ] **Step 3: Implement copy-code progressive enhancement**

Create `src/components/CodeCopy.astro` with a single module script that finds `pre > code`, inserts a `button type="button"` labeled `Copy code`, calls `navigator.clipboard.writeText(code.textContent ?? '')`, changes the label to `Copied`, announces the change with `aria-live="polite"`, and restores `Copy code` after 1.5 seconds. If clipboard access rejects, set the label to `Copy failed` and leave the original code selectable.

- [ ] **Step 4: Implement resilient Giscus comments**

Create `GiscusComments.astro`. When all four Giscus identifiers are non-empty, render the official `https://giscus.app/client.js` script with `data-mapping="pathname"`, `data-strict="1"`, `data-reactions-enabled="1"`, `data-emit-metadata="0"`, `data-input-position="top"`, `data-theme="light"`, `data-lang="en"`, and `crossorigin="anonymous"`. Otherwise render: “Comments will be available after the public GitHub Discussions repository is connected.”

Add a client timeout that changes a visually hidden status to “Comments are currently unavailable. The article remains available above.” if the iframe does not load within eight seconds.

- [ ] **Step 5: Render only non-empty learning paths**

Create `src/pages/learning-paths/index.astro`. Query published posts, call `getLearningPathGroups`, sort each group by `learningPath.order`, and render a group only when it contains at least one post. Use labels and descriptions from `learningPathConfig`.

- [ ] **Step 6: Verify and commit article delivery**

Run: `npm run check && npm run build`

Expected: sample article HTML exists; its main article has `data-pagefind-body`; Pagefind reports at least one indexed page; `/learning-paths/index.html` lists the MCP path.

```bash
git add src/layouts/PostLayout.astro src/components/CodeCopy.astro src/components/GiscusComments.astro src/pages/articles src/pages/learning-paths
git commit -m "feat: render labs and learning paths"
```

---

### Task 5: Add searchable article discovery with topic and difficulty filters

**Files:**
- Create: `src/components/SearchPanel.astro`
- Create: `src/pages/articles/index.astro`
- Create: `tests/site.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: Pagefind browser API and Pagefind filter attributes emitted by `PostLayout`.
- Produces: `/articles/` discovery UI and initial browser test harness.

- [ ] **Step 1: Write the first browser discovery test**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1', port: 4321, reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ]
});
```

Add to `tests/site.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('search finds the MCP lab and filters by difficulty', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('Lightspeed');
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
  await page.getByLabel('Difficulty').selectOption('intermediate');
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
});

test('empty search gives useful recovery guidance', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('no-such-lab-phrase');
  await expect(page.getByText('Try another term or remove a filter.')).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test and verify the red state**

Run: `npx playwright install chromium && npm run test:e2e -- tests/site.spec.ts`

Expected: FAIL because `/articles/` and its controls do not exist.

- [ ] **Step 3: Build the articles index shell**

Create `src/pages/articles/index.astro`. Render `BaseLayout`, heading `Articles`, a one-sentence explanation, `SearchPanel`, and a no-JavaScript list of all published `PostCard` entries. Include topic and difficulty values as `data-*` attributes so the interface remains useful before Pagefind initializes.

- [ ] **Step 4: Implement Pagefind search and filter behavior**

Create `SearchPanel.astro` with:

- Search input labeled `Search articles`
- Topic select labeled `Topic`
- Difficulty select labeled `Difficulty`
- Results summary with `aria-live="polite"`
- Results region
- Hidden empty state text `Try another term or remove a filter.`

The module script must dynamically import `/pagefind/pagefind.js`, debounce search by 150ms, pass selected filters to `pagefind.search(query, { filters })`, call each result's `data()` function, and render result links using DOM APIs rather than `innerHTML`. On import failure, keep the static article list visible and show “Search is unavailable; browse all articles below.”

Read `topic` from `URLSearchParams` during initialization so topic-rail links preselect the requested filter. Update the query string with `history.replaceState` when filters change.

- [ ] **Step 5: Rebuild and run browser tests**

Run: `npm run build && npm run test:e2e -- tests/site.spec.ts`

Expected: both desktop and mobile projects PASS the search and empty-state tests.

- [ ] **Step 6: Commit discovery**

```bash
git add src/components/SearchPanel.astro src/pages/articles/index.astro tests/site.spec.ts playwright.config.ts
git commit -m "feat: add searchable article discovery"
```

---

### Task 6: Add newsletter, RSS, sitemap metadata, and integration validation

**Files:**
- Create: `src/components/NewsletterForm.astro`
- Create: `src/pages/rss.xml.ts`
- Create: `tests/draft-output.test.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `getPublicIntegrationConfig`, `siteConfig`, published post query.
- Produces: Buttondown form behavior, `/rss.xml`, production config guard, and draft-exclusion verification.

- [ ] **Step 1: Write production-output assertions**

Create `tests/draft-output.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isPublished } from '../src/lib/posts';

describe('production publication boundary', () => {
  it('excludes drafts from every downstream production query', () => {
    const draft = { id: 'private-draft', data: { draft: true } } as never;
    expect(isPublished(draft, 'production')).toBe(false);
  });
});
```

Run: `npm test -- tests/draft-output.test.ts`

Expected: PASS, documenting the shared boundary used by pages and feeds.

- [ ] **Step 2: Implement the Buttondown form with retained failure input**

Create `NewsletterForm.astro`. If `PUBLIC_BUTTONDOWN_USERNAME` is empty in development, render the setup notice. In production, throw a descriptive build error naming that variable. Otherwise render a form posting to `https://buttondown.com/api/emails/embed-subscribe/<encoded username>` with `name="email"`, `type="email"`, `required`, and hidden `embed=1`.

Enhance submission with `fetch(new FormData(form))`. On success clear the input and show `Subscribed. Check your inbox to confirm.` On failure leave the email untouched and show `Subscription did not complete. Check your connection and try again.` Announce both messages through `aria-live="polite"`. If JavaScript is unavailable, allow the native Buttondown POST.

Add the form to the homepage after recent articles.

- [ ] **Step 3: Implement the RSS feed from the same published query**

Create `src/pages/rss.xml.ts`:

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished, sortNewest } from '../lib/posts';
import { siteConfig } from '../config/site';

export async function GET(context: { site?: URL }) {
  const posts = sortNewest((await getCollection('posts')).filter((post) => isPublished(post, 'production')));
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedDate,
      link: `/articles/${post.id}/`
    }))
  });
}
```

- [ ] **Step 4: Add article-specific metadata**

Extend `BaseLayout` props with published and updated dates. When `article` is true, render `article:published_time` and optional `article:modified_time`. PostLayout must pass these values. Confirm canonical URLs derive from `Astro.url.pathname` and `Astro.site`.

- [ ] **Step 5: Verify integrations and commit**

Run with a non-secret test username:

```bash
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run build
npm test
```

Expected: build PASS; `dist/rss.xml` contains the sample article; no draft identifier appears in `dist/rss.xml` or `dist/pagefind/`; sitemap contains the sample article canonical URL.

```bash
git add src/components/NewsletterForm.astro src/pages/rss.xml.ts src/pages/index.astro src/layouts/BaseLayout.astro src/layouts/PostLayout.astro tests/draft-output.test.ts
git commit -m "feat: add publishing integrations"
```

---

### Task 7: Complete accessibility, responsive QA, link validation, and author documentation

**Files:**
- Create: `scripts/check-links.mjs`
- Modify: `tests/site.spec.ts`
- Create: `README.md`
- Create: `public/social-default.svg`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: complete built site.
- Produces: release verification command and author operating guide.

- [ ] **Step 1: Add accessibility and responsive browser assertions**

Append to `tests/site.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';

test('core pages have no serious accessibility violations', async ({ page }) => {
  for (const path of ['/', '/articles/', '/learning-paths/', '/about/']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
});

test('keyboard users can reach main content and navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mobile page does not overflow horizontally', async ({ page }) => {
  await page.goto('/articles/connect-mcp-server-to-lightspeed/');
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});
```

- [ ] **Step 2: Implement built-output internal-link checking**

Create `scripts/check-links.mjs`. Recursively read `dist/**/*.html` using Node filesystem APIs, parse each document with Cheerio, collect local `a[href]` values, ignore fragments, `mailto:`, `tel:`, and external origins, resolve clean URLs to `dist/<path>/index.html` and file URLs to their exact paths, then print each missing target and exit with status 1. Print `Internal links: PASS` and exit 0 when none are missing.

Use this implementation:

```js
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { load } from 'cheerio';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

const root = join(process.cwd(), 'dist');
const htmlFiles = (await walk(root)).filter((file) => file.endsWith('.html'));
const missing = [];

for (const file of htmlFiles) {
  const $ = load(await readFile(file, 'utf8'));
  for (const element of $('a[href]').toArray()) {
    const href = $(element).attr('href');
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) continue;
    const pathname = href.split(/[?#]/)[0];
    const relative = pathname.startsWith('/') ? pathname.slice(1) : normalize(join(dirname(file.slice(root.length + 1)), pathname));
    const target = relative.endsWith('.html') || relative.includes('.')
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
```

- [ ] **Step 3: Add the default social asset and align metadata**

Create `public/social-default.svg` at 1200×630 using only the approved palette. Include the title, subtitle, editorial promise, and a restrained terminal-status motif. Update `BaseLayout` to reference `/social-default.svg`.

- [ ] **Step 4: Write the complete author operating guide**

Create `README.md` with exact sections and commands:

1. Purpose and personal-site disclaimer
2. Requirements: Node.js 22 and npm
3. `npm install`, `npm run dev`, and `npm run verify`
4. Frontmatter template containing every `postSchema` field
5. Create, preview, publish, update, draft, and delete workflows
6. Image placement rules
7. How to add a controlled topic and learning path in both schema and config
8. Vercel import and `PUBLIC_SITE_URL` configuration
9. Buttondown username configuration and form test
10. Public GitHub repository, Discussions, Giscus app, and four Giscus identifiers
11. Deployment checklist and rollback through Git revert

The publishing section must explicitly state that `draft: true` is required until a lab's commands and tested versions have been reviewed.

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run verify
```

Expected:

- Vitest: all tests PASS
- Astro check: zero errors
- Astro production build: PASS
- Pagefind: at least one indexed article
- Link checker: `Internal links: PASS`
- Playwright desktop and mobile: all tests PASS
- Axe: no serious or critical violations on core routes

- [ ] **Step 6: Review production output manually**

Run: `npm run preview -- --host 127.0.0.1`

Inspect at 390px, 768px, 1280px, and 1600px widths. Confirm the approved split hero, topic access, article hierarchy, terminal motif, code scrolling, focus visibility, newsletter states, and personal-site disclaimer. Confirm no page suggests the site is an official Red Hat property.

- [ ] **Step 7: Commit release readiness**

```bash
git add scripts/check-links.mjs tests/site.spec.ts README.md public/social-default.svg src/layouts/BaseLayout.astro
git commit -m "docs: complete blog release workflow"
```

---

## Final Release Gate

- [ ] Run `git status --short`; expected output is empty.
- [ ] Run `git log --oneline --max-count=7`; expected output shows one focused commit for each completed task.
- [ ] Confirm the Vercel project has the production values from `.env.example`.
- [ ] Confirm the GitHub repository is public, Discussions is enabled, and the Giscus app is installed before advertising comments.
- [ ] Replace the test Buttondown username with the real configured username.
- [ ] Deploy through Vercel and rerun the core Playwright navigation test against the production URL.
