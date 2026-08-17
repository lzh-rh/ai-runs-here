# AI Runs Here

A personal technical blog about Applied AI on OpenShift. The site contains practical notes and labs for OpenShift Lightspeed, Agentic Lightspeed, MCP Gateway, MCP Server, and MCP Lifecycle Operator.

This is not an official Red Hat website or a statement of Red Hat product support. Validate product behavior against the sources linked in each article.

- Website: <https://lzh-rh.github.io/ai-runs-here/>
- Repository: <https://github.com/lzh-rh/ai-runs-here>

## Run locally

Use Node.js 22.12 or newer:

```bash
npm ci
cp .env.example .env
npm run dev
```

Open <http://localhost:4321/ai-runs-here/>.

## Add a blog post

Create a Markdown or MDX file in `src/content/posts/`:

```yaml
---
kind: guide
title: "Your article title"
description: "A concise description of what readers will learn from this article."
publishedDate: 2026-08-17
topic: mcp-server
tags:
  - mcp
difficulty: beginner
estimatedMinutes: 10
testedVersions: []
prerequisites: []
draft: true
featured: false
---
```

Available topics are:

- `openshift-lightspeed`
- `agentic-lightspeed`
- `mcp-gateway`
- `mcp-server`
- `mcp-lifecycle-operator`

Keep `draft: true` while writing. Set it to `false` when the post is ready. A published lab must include the exact product versions that were tested.

## Verify

On a new checkout, install the browser engines once:

```bash
npx playwright install chromium webkit
```

Before publishing, run:

```bash
PUBLIC_SITE_URL=https://lzh-rh.github.io \
PUBLIC_BASE_PATH=/ai-runs-here/ \
PLAYWRIGHT_BASE_PATH=/ai-runs-here/ \
npm run verify
```

This checks the content schema, static build, links, accessibility, responsive layout, and desktop/mobile browser behavior.

## Deploy

Commit the change and push it to `main`. The workflow in `.github/workflows/deploy-pages.yml` verifies the site and publishes `dist/` to GitHub Pages.
