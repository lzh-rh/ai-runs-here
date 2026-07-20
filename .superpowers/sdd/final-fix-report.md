# Whole-branch final fix report

Date: 2026-07-20

Status: PASS

## Fixes completed

1. Added a cross-platform Node sync that copies `dist/pagefind/` into the existing Astro Vercel adapter artifact, refuses to manufacture an artifact when `.vercel/output/config.json` is absent, and asserts `.vercel/output/static/pagefind/pagefind.js` exists. The production build and full verification gate both run the assertion.
2. Returned `connect-mcp-server-to-lightspeed.mdx` to draft, removed the unverified version and verified-query claims, and stated explicitly that the outline does not connect a server or perform a query. Added the truthful published reading guide `start-learning-applied-ai-on-openshift.mdx`, which reports no product test and supplies useful production content without invented versions or results.
3. Made article routes, article listings, learning paths, and related-post queries use development mode during local preview and production mode during builds. RSS remains production-only.
4. Added a small visible Giscus unavailable message while retaining the polite live status. Script errors reveal it immediately; the eight-second iframe timeout remains the second failure path.
5. Updated About with the approved fact that Li is a Technical Marketing Manager focused on Applied AI in OpenShift.
6. Added homepage learning-path entry cards derived from non-empty visible path groups. Production currently renders only the published `Start with OpenShift AI` path; the draft MCP path is excluded.
7. Added canonical site-origin validation. Development and `astro check` can use the localhost fallback; production builds reject an absent value, a malformed/non-origin value, and explicit localhost.
8. Replaced the undefined newsletter `--ink` color with `--cluster`.
9. Added the published article route to the axe loop and added a browser regression for the visible Giscus failure state.

README now documents the production URL requirement, draft preview boundary, empty tested-version behavior for non-lab guides, Vercel adapter artifact, Pagefind sync, and deployment-artifact check.

## Test-first evidence

Initial regression command:

```text
npm test -- tests/review-regressions.test.ts tests/content-schema.test.ts
```

Initial result: expected RED, 11 failed and 4 passed. The failures covered all missing contracts: Pagefind artifact sync, build assertion, preview-mode queries, truthful draft/published content, Giscus visibility, About identity, homepage paths, newsletter color, article axe coverage, URL validation, and empty tested versions for a non-lab guide.

Additional artifact/URL hardening command:

```text
npm test -- tests/review-regressions.test.ts
```

Intermediate result: expected RED, 2 failed and 9 passed. The sync still manufactured a static directory without an adapter artifact, and production still allowed explicit localhost. Both are now guarded.

Giscus browser regression initially reproduced a timing race on desktop:

```text
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run test:e2e
```

Intermediate result: 21 passed, 1 failed. Desktop observed the external script error before the later listener attached. Moving the immediate failure handler onto the external script eliminated the race; the rerun passed 22/22.

## Exact full gate

Command:

```text
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run verify
```

Final output summary (exit 0):

```text
Vitest: 5 files passed, 29 tests passed
Astro check: 33 files, 0 errors, 0 warnings, 0 hints
Astro build: 5 pages built
Production article routes:
  /articles/start-learning-applied-ai-on-openshift/
Pagefind: 1 page indexed, 107 words, 2 filters
Vercel Pagefind artifact: PASS (.vercel/output/static/pagefind/pagefind.js)
Internal links: PASS
Playwright: 22 passed across desktop and mobile
Axe: no serious or critical violations on home, articles, learning paths, About, or the representative article
```

The only console noise was Playwright's non-failing `NO_COLOR`/`FORCE_COLOR` warning.

## Negative production builds

Missing URL command:

```text
env -u PUBLIC_SITE_URL PUBLIC_BUTTONDOWN_USERNAME=test npm run build
```

Result (expected exit 1):

```text
Astro check: 0 errors, 0 warnings, 0 hints
PUBLIC_SITE_URL is required for production builds. Set it to the public site origin.
```

Invalid URL command:

```text
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=not-a-url npm run build
```

Result (expected exit 1):

```text
PUBLIC_SITE_URL must be a valid absolute HTTP(S) origin without credentials, a path, query parameters, or a fragment.
```

Development fallback check:

```text
env -u PUBLIC_SITE_URL npm run check
```

Result (exit 0):

```text
Result (33 files):
- 0 errors
- 0 warnings
- 0 hints
```

## Deployment artifact inspection

Command:

```text
stat -f '%N %z bytes' .vercel/output/config.json .vercel/output/static/pagefind/pagefind.js
find .vercel/output/static/articles -maxdepth 2 -type f | sort
```

Output:

```text
.vercel/output/config.json 275 bytes
.vercel/output/static/pagefind/pagefind.js 45555 bytes
.vercel/output/static/articles/index.html
.vercel/output/static/articles/start-learning-applied-ai-on-openshift/index.html
```

Draft exclusion inspection:

```text
rg -l "connect-mcp-server-to-lightspeed|Connect an MCP server" .vercel/output/static dist
```

Result: expected exit 1 with no matches. The draft MCP route, title, RSS entry, sitemap entry, and Pagefind entry are absent from production output.

## Self-review

- `git diff --check`: PASS.
- Reviewed every changed application, content, test, configuration, script, and README file against the nine findings.
- Confirmed the Vercel artifact contains its adapter config and Pagefind browser entry.
- Confirmed production exposes one truthful published article and one non-empty learning path while excluding the MCP draft.
- Confirmed no lab result or tested product version was invented.
- Remaining concerns: none.
