# AI Runs Here

## Purpose and disclaimer

AI Runs Here is a personal site for practical labs, diagrams, and field notes about Applied AI on OpenShift. Its editorial promise is: “Tested labs, useful diagrams, and honest notes from the terminal.”

This is a personal learning publication. It is not an official Red Hat website, product-documentation site, or statement of Red Hat support.

## Requirements

- Node.js 22 (the project requires Node.js 22.12 or newer)
- npm

## Install, run, and verify

Install the pinned dependencies:

```bash
npm install
```

Start the local authoring server:

```bash
npm run dev
```

Local development uses `http://localhost:4321` when `PUBLIC_SITE_URL` is not set. Production builds do not use that fallback: `PUBLIC_SITE_URL` must be an absolute HTTP(S) origin such as `https://blog.example.com`, with no path, query, or fragment.

Before publishing, run the same release gate used by the project:

```bash
PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run verify
```

`npm run verify` runs the Vitest suite, Astro checks, the production build, Pagefind indexing, Vercel deployment-artifact validation, internal-link validation, and Playwright desktop/mobile tests. The build copies Pagefind into `.vercel/output/static/pagefind/` after the Astro adapter creates the Vercel artifact, then asserts `.vercel/output/static/pagefind/pagefind.js` exists. The values above are deliberately non-secret test values; use the real public values in Vercel.

## Post frontmatter

Posts are Markdown or MDX files under `src/content/posts/`. This template includes every field accepted by `postSchema`; `updatedDate`, `learningPath`, and `image` may be removed when they do not apply.

```yaml
---
title: "Connect a service to an Applied AI workflow"
description: "A concise summary between 20 and 180 characters for article lists, search, and social metadata."
publishedDate: 2026-07-20
updatedDate: 2026-07-20
topic: mcp
tags:
  - openshift
  - integration
difficulty: intermediate
estimatedMinutes: 20
testedVersions:
  - "OpenShift Container Platform 4.20.0"
  - "Example service 1.2.3"
prerequisites:
  - "Access to a test cluster"
  - "The oc CLI is authenticated"
draft: true
featured: false
learningPath:
  id: mcp
  order: 1
image: /images/example-social.svg
---
```

Use exact product versions in `testedVersions`; do not replace them with an unverified range such as `latest`. An explanatory or editorial guide that reports no product test may use `testedVersions: []`; the tested-versions panel is then omitted. A product lab must remain a draft until its exact versions and results have been reviewed.

## Author workflows

### Create

1. Create `src/content/posts/<slug>.mdx`, using a short lowercase, hyphenated slug.
2. Copy the full frontmatter template and keep `draft: true`.
3. Add the article body and useful alt text for each meaningful image.
4. Run `npm run dev` and open the local URL printed by Astro.

### Preview

Drafts are available during local development on their article routes, the Articles page, the homepage, related-post results, and any selected learning path. Production builds exclude those routes and references. Exercise commands in a safe environment and record the exact versions tested. Run `npm run verify` before requesting editorial or technical review.

### Publish

`draft: true` is required until a lab's commands and tested versions have been reviewed. After that review:

1. Set `draft: false` and set `publishedDate` to the intended publication date.
2. Decide whether the post should be `featured` and verify its learning-path order, if any.
3. Run `PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run verify`.
4. Commit and push the reviewed source. Vercel publishes the new production build from the configured production branch.

### Update

Edit the existing source rather than creating a duplicate. Keep `publishedDate` unchanged, set `updatedDate` to the date of the material update, refresh `testedVersions`, rerun the commands, run the release gate, and push the reviewed commit.

### Return to draft

Set `draft: true`, run the release gate, and push. Production pages, Pagefind search, RSS, and the sitemap exclude the post after Vercel rebuilds the site. Keep in mind that a draft flag does not erase copies that were already published or cached.

### Delete

Remove the post source and any article-only assets that no other post uses. Remove links to that route, run the release gate so the link checker can find stale references, then commit and push. The route disappears at the next Vercel deployment.

## Images

- Put article-specific body images beside the article source. For multiple assets, keep `src/content/posts/<slug>.mdx`, add a neighboring `src/content/posts/<slug>-assets/` directory, and reference its files with relative paths such as `./<slug>-assets/diagram.png`.
- Put shared interface, brand, and social assets under `public/`; reference them with root-relative URLs such as `/images/diagram.svg`.
- The frontmatter `image` value is used as a metadata URL, so its file must be served from `public/` and its value must start with `/`.
- Use descriptive lowercase filenames, compress raster images, and include useful alt text. Mark decorative images with empty alt text.
- Do not commit credentials, private screenshots, customer data, or assets without publication rights.

## Add a controlled topic

A topic must exist in both the schema and display configuration:

1. Add its slug to the `topics` tuple in `src/content.config.ts`.
2. Add the same key, label, and description to `topicConfig` in `src/config/site.ts`.
3. Use the slug in a post's `topic` field.
4. Run `npm run verify`. Type checking catches a missing `topicConfig` entry.

## Add a learning path

A learning-path identifier must also exist in both places:

1. Add the identifier to the `learningPath.id` enum in `src/content.config.ts`.
2. Add the same key, label, and description to `learningPathConfig` in `src/config/site.ts`.
3. Assign published posts that identifier plus unique positive `order` values.
4. Run `npm run verify` and inspect `/learning-paths/`.

A path appears only after it contains at least one published post. Use stable identifiers because changing one requires updating every post that refers to it.

## Deploy with Vercel

1. Push this project to the public GitHub repository that will own the site.
2. In Vercel, choose **Add New → Project**, import that repository, and select the production branch.
3. Let Vercel detect Astro and use `npm run build` as the build command. The Astro Vercel adapter creates `.vercel/output`; the final build step adds the Pagefind files to its `static` directory. Leave Vercel's output-directory override unset when using the adapter artifact.
4. Set the Node.js runtime to 22.
5. Add `PUBLIC_SITE_URL` for Production with the final public origin, for example `https://blog.example.com`. Do not include a path. Add the real Buttondown and Giscus values described below.
6. Deploy, then confirm canonical links, Open Graph URLs, RSS, and `sitemap-index.xml` use the final origin.

To check the generated deployment artifact locally after a build, run:

```bash
npm run check:deployment-artifact
```

It fails unless `.vercel/output/static/pagefind/pagefind.js` exists. You can also confirm the required production URL guard by running `PUBLIC_BUTTONDOWN_USERNAME=test npm run build`; the command must fail with a `PUBLIC_SITE_URL is required` message.

All current integration values are public identifiers, not secrets. If a future integration adds a secret, store it only in Vercel environment variables and never prefix it with `PUBLIC_`.

## Configure and test Buttondown

1. Create or select a Buttondown newsletter and note its public username.
2. Set `PUBLIC_BUTTONDOWN_USERNAME` to the username only, not a URL. Configure it for Production in Vercel.
3. For a local integration test, run:

   ```bash
   PUBLIC_BUTTONDOWN_USERNAME=your-buttondown-username PUBLIC_SITE_URL=http://localhost:4321 npm run dev
   ```

4. Submit a test address through the homepage form. Confirm the success message appears and the confirmation email arrives. Also test an invalid email and an offline or blocked request; the entered address must remain available for retry after a network failure.
5. Replace any placeholder or `test` value before deployment.

## Configure Giscus comments

Giscus stores comments in GitHub Discussions. Before advertising comments:

1. Make the GitHub repository public.
2. Enable **Settings → General → Features → Discussions**.
3. Install the Giscus GitHub app for the repository.
4. Open [giscus.app](https://giscus.app), enter the repository, choose the Discussions category, and use pathname mapping.
5. Copy the four generated identifiers into Vercel Production variables:

   - `PUBLIC_GISCUS_REPO`: `owner/public-repository`
   - `PUBLIC_GISCUS_REPO_ID`: repository ID generated by Giscus
   - `PUBLIC_GISCUS_CATEGORY`: the enabled Discussions category name
   - `PUBLIC_GISCUS_CATEGORY_ID`: category ID generated by Giscus

6. Deploy and open a published article. Confirm the Giscus frame loads and a test discussion can be created. Then block the Giscus request once in browser developer tools and confirm the article remains readable and the unavailable state is announced.

Do not invent or hand-edit the repository and category IDs; copy them from the Giscus configuration output.

## Deployment checklist and rollback

Before a production deployment:

- Confirm every new lab's commands and exact tested versions were reviewed before setting `draft: false`.
- Confirm `PUBLIC_SITE_URL` is the production origin.
- Replace the test Buttondown username with the real public username and submit the form once.
- Confirm the GitHub repository is public, Discussions is enabled, the Giscus app is installed, and all four Giscus identifiers are configured.
- Run `PUBLIC_BUTTONDOWN_USERNAME=test PUBLIC_SITE_URL=https://example.com npm run verify` with no failures.
- Review the home, Articles, Learning paths, About, and article pages at mobile and desktop widths.
- Confirm the footer says the site is personal and unofficial.
- After deployment, smoke-test navigation, search, one article, RSS, the sitemap, newsletter submission, and comments.

To roll back a bad source deployment, revert the offending commit instead of rewriting shared history:

```bash
git log --oneline
git revert <bad-commit-sha>
git push origin <production-branch>
```

Vercel builds the revert commit and restores the previous source state. Watch the deployment finish, then repeat the production smoke test.
