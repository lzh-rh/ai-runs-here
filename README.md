# AI Runs Here

## Purpose and personal/unofficial disclaimer

AI Runs Here is Li's personal publication for practical notes about Applied AI on OpenShift. It is not an official Red Hat website, product-documentation site, or statement of Red Hat support. Treat each post as a field note and confirm product behavior with the linked sources of record.

## Requirements and local setup

Use Node.js 22.12 or newer and npm. From the repository root:

```bash
npm ci
cp .env.example .env
npm run dev
```

Open the URL printed by Astro. With the example values unchanged, use `http://localhost:4321/repository-name/`; replace both placeholders before a real deployment. Keep `.env` local; commit only `.env.example`.

## Content topics and MCP labels

Posts live in `src/content/posts/` as Markdown or MDX. Use one of these topic slugs:

- `openshift-lightspeed` — OpenShift Lightspeed
- `agentic-lightspeed` — Agentic Lightspeed
- `mcp` — MCP

Only an MCP post may use `mcpLabels`. Its allowed values are:

- `mcp-gateway` — MCP Gateway
- `mcp-server` — MCP Server
- `mcp-lifecycle-operator` — MCP Lifecycle Operator

Use `mcpLabels: []` for a non-MCP post. The content schema rejects unknown topics or labels and rejects MCP labels on another topic.

## Frontmatter template with `mcpLabels`

Start a new post as a draft. This example makes no claim that a product workflow was tested:

```yaml
---
kind: guide
title: "Plan an MCP experiment on OpenShift"
description: "A field-note template for recording an MCP experiment without claiming an unverified result."
publishedDate: 2026-08-17
updatedDate: 2026-08-17
topic: mcp
mcpLabels:
  - mcp-server
tags:
  - experiment
difficulty: beginner
estimatedMinutes: 10
testedVersions: []
prerequisites:
  - "Access to a safe test environment"
draft: true
featured: false
image: /social-default.svg
---
```

Use `kind: lab` for a tested procedure and `kind: guide` for explanatory writing. Remove optional `updatedDate` and `image` when they do not apply. A published lab must list the exact versions actually tested; never substitute `latest`, a guessed range, or a version copied from unrelated documentation.

## Create, preview, publish, update, return-to-draft, and delete workflows

### Create and preview

1. Create `src/content/posts/<short-lowercase-slug>.mdx` from the template.
2. Keep `draft: true` while writing and testing.
3. Run `npm run dev` and review the draft route, article list, topic page, links, images, and mobile layout. Drafts are visible locally in development.

### Publish

1. For a lab, run every procedure in a safe environment and record only the exact versions and results observed.
2. Set `draft: false`; set `publishedDate`; update `featured` only when intentional.
3. Run the root and project-site checks in **Local verification**.
4. Commit and push the reviewed change to `main`. The repository workflow verifies and deploys it.

### Update

Edit the existing file. Keep `publishedDate`, add or refresh `updatedDate`, rerun any affected procedure, refresh truthful `testedVersions`, verify, commit, and push.

### Return to draft

Set `draft: true`, verify, commit, and push. The next production build removes the post from its route, listings, RSS, and sitemap. Previously published or cached copies may still exist elsewhere.

### Delete

Delete the post and assets used only by it, remove links to its route, verify, commit, and push. The link checker catches internal references left behind.

## Images and tested-version truthfulness

Keep shared public assets in `public/` and reference them with base-aware site URLs. Keep article-only images beside the article or in a neighboring `<slug>-assets/` directory and import them from the MDX file. Use descriptive filenames and alt text, compress raster images, and never publish credentials, customer data, private screenshots, or assets without publication rights.

`testedVersions` is evidence, not a compatibility promise. Add a version only after running the documented workflow on that version. Leave it empty for a guide or draft lab when no product version was tested; a lab cannot be published until the schema has at least one exact tested version.

## Local verification

Run both release modes before publishing:

```bash
PUBLIC_SITE_URL=https://blog.example.com PUBLIC_BASE_PATH=/ PLAYWRIGHT_BASE_PATH=/ npm run verify
PUBLIC_SITE_URL=https://example.github.io PUBLIC_BASE_PATH=/ai-runs-here/ PLAYWRIGHT_BASE_PATH=/ai-runs-here/ npm run verify
```

Each command runs unit tests, Astro checks, the static build, internal-link checks, and browser tests. The browser suite checks navigation, articles, drafts, RSS, sitemap, accessibility, and responsive overflow.

## GitHub Pages project-site deployment

The workflow at `.github/workflows/deploy-pages.yml` runs on pushes to `main` and can also be started manually. In the repository's Pages settings, select **GitHub Actions** as the source. By default, the workflow builds the project site with:

```dotenv
PUBLIC_SITE_URL=https://<account>.github.io
PUBLIC_BASE_PATH=/<repository-name>/
```

It runs `npm ci`, installs the Chromium test dependency, runs `npm run verify`, and uploads `dist/` only after verification succeeds. The deploy job then publishes that artifact. No remote deployment is needed to validate the local artifact.

## Optional custom-domain configuration using repository variables `SITE_URL` and `BASE_PATH=/`

After configuring the custom domain in GitHub Pages and its DNS, add these Actions repository variables under **Settings → Secrets and variables → Actions → Variables**:

```dotenv
SITE_URL=https://blog.example.com
BASE_PATH=/
```

`SITE_URL` must be the public HTTP(S) origin without a path, query, or fragment. `BASE_PATH=/` switches canonical URLs, assets, RSS, sitemap, and internal links from the repository subpath to the domain root. Run the root release command locally before publishing this configuration.

## Rollback with `git revert`

Undo a bad published commit without rewriting shared history:

```bash
git log --oneline
git revert <bad-commit-sha>
git push origin main
```

The workflow verifies and deploys the revert. After it finishes, check the homepage, affected article, RSS, and sitemap at the public URL.
