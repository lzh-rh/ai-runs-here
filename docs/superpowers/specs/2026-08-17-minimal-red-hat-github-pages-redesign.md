# AI Runs Here Minimal Red Hat Redesign

## Purpose

Simplify **AI Runs Here** into a clean personal technical blog focused on three subjects:

1. OpenShift Lightspeed
2. Agentic Lightspeed
3. Model Context Protocol (MCP)

The site exists primarily for reading practical articles. Navigation, typography, and whitespace should make the content easier to understand without introducing product-style controls or decorative interface elements.

The publication remains personal and unofficial. It may follow Red Hat Design System foundations, but it must not use the Red Hat logo or imply that it is an official Red Hat website.

## Identity

- **Title:** AI Runs Here
- **Subtitle:** Applied AI on OpenShift
- **Editorial focus:** OpenShift Lightspeed, Agentic Lightspeed, and MCP
- **Voice:** Direct, approachable, technically accurate, and explicit about what was tested
- **Audience:** Developers, platform engineers, technical marketers, customers, and learners exploring Applied AI on OpenShift

## Design Direction

The approved direction is **RHDS editorial minimal**. The site follows Red Hat Design System foundations for branded digital experiences while remaining visually quieter than an official marketing page.

### Typography

- Use Red Hat Display for headings.
- Use Red Hat Text for body copy and navigation.
- Use Red Hat Mono only for commands, code, versions, and technical identifiers.
- Use sentence case for headings and navigation.
- Do not change font tracking.
- Keep article body text at or below 789px wide.
- Keep body line height at least 1.5.

Fonts must be self-hosted or loaded from an approved stable public Red Hat font source with system-font fallbacks. The site must remain readable if the webfonts fail.

### Color

- Brand red: `#EE0000`
- Brand red hover: `#A60000`
- Primary text: `#151515`
- Secondary text: `#4F5255`
- Border: `#D2D2D2`
- Subtle surface: `#F2F2F2`
- Page surface: `#FFFFFF`
- Inline link blue: `#0066CC`

Red is an accent, not a large background. Use it for the thin top rule, the active navigation state, selected topic emphasis, and occasional key heading text. Inline links are blue and underlined.

### Spacing and grid

- Use a 4px-based spacing scale.
- Use 16px mobile page gutters.
- Use 32px desktop page gutters.
- Use 64px default desktop section spacing and reduce it on small screens.
- Follow a responsive RHDS-style max-width grid.
- Keep the article reading column at 789px or narrower.

### Visual restraint

Remove gradients, shadows, decorative icons, oversized technical labels, the terminal-status motif, card-heavy grids, and nonessential animation. The site signature is a thin Red Hat red top rule and a plain three-topic index.

## Information Architecture

### Header

The site title links home. Primary navigation contains:

- OpenShift Lightspeed
- Agentic Lightspeed
- MCP
- About
- Search

The mobile header uses one accessible menu button. It must not introduce a multi-level navigation system.

### Homepage

The homepage contains only:

1. A short introduction
2. Three plain topic rows
3. A newest-articles list

The introduction uses the heading **Learn by building.** and describes the publication as practical notes on OpenShift Lightspeed, agentic systems, and MCP.

### Topic pages

Create one page for each primary topic:

- `/topics/openshift-lightspeed/`
- `/topics/agentic-lightspeed/`
- `/topics/mcp/`

Each page contains a concise topic description followed by its published articles. An empty topic displays “Articles are coming.”

The MCP page may expose these post labels without creating additional nested pages:

- `mcp-gateway`
- `mcp-server`
- `mcp-lifecycle-operator`

### Articles page

The Articles page contains one search field and a chronological list of published posts. It does not expose advanced topic or difficulty filter controls. Search results include the article title, description, primary topic, date, and optional MCP labels.

### Article page

An article may contain:

- Title and summary
- Publication and update dates
- Difficulty and estimated time
- Tested versions
- Prerequisites
- Table of contents
- Article body
- Commands and code-copy controls
- Troubleshooting notes
- References
- Related articles

Comments and newsletter prompts are removed.

### About page

The About page identifies Li as a Technical Marketing Manager focused on Applied AI in OpenShift, explains the learn-by-building method, and clearly states that the site is personal and unofficial.

### Removed routes and features

Remove:

- The Learning paths page and navigation
- Newsletter form and Buttondown configuration
- Comments and Giscus configuration
- Terminal-status component
- Advanced search filters
- Vercel-specific deployment behavior

Do not leave disabled versions of these features in the UI or production bundle.

## Content Model

Primary post topics are exactly:

- `openshift-lightspeed`
- `agentic-lightspeed`
- `mcp`

MCP posts may use any of these controlled labels:

- `mcp-gateway`
- `mcp-server`
- `mcp-lifecycle-operator`

Non-MCP posts must not use MCP labels. Existing publication safeguards remain:

- Frontmatter strings are trimmed and validated.
- Drafts are absent from production routes, lists, search, RSS, and sitemap.
- Published labs require nonblank tested versions.
- Updated dates cannot precede publication dates.
- Invalid frontmatter stops the build with a file-specific error.

Markdown and MDX remain under `src/content/posts/`. Creating, editing, drafting, publishing, and deleting a post remain Git-based workflows.

## Search

Pagefind continues to generate a static article-only index after the Astro build. The Articles page exposes one plain search input. When the query is blank, show the chronological article list. When Pagefind is unavailable, keep the same article list visible and show a small explanatory message.

Search must work correctly under both a repository subpath and a custom-domain root path.

## GitHub Pages Deployment

Replace Vercel with GitHub Pages.

- Use GitHub Actions and the official Astro deployment action or the official Pages artifact actions.
- Run verification before deployment.
- Deploy only the generated static site.
- Support a GitHub project URL such as `https://<username>.github.io/<repository>/` using the Astro `site` and `base` configuration.
- Support a future custom domain at the root path.
- Keep the Pagefind bundle inside the deployed artifact.
- Remove the Vercel adapter, `.vercel` artifact logic, Vercel scripts, dependencies, and documentation.

The repository's Pages workflow must not require secrets for a normal GitHub Pages deployment.

## Failure and Empty States

- Empty topic: show “Articles are coming.”
- No articles: show a short invitation to return after the first article is published.
- No search matches: show “No articles match your search.” and offer to clear the query.
- Pagefind unavailable: keep the full article list and state that search is unavailable.
- Invalid content: fail the build and name the source file and invalid field.
- Invalid GitHub Pages site/base configuration: fail verification before deployment.
- Missing webfonts: use system fallbacks without layout breakage.

## Accessibility and Performance

- Maintain semantic landmarks and heading order.
- Maintain keyboard navigation and visible focus.
- Keep inline links underlined.
- Respect reduced-motion preferences.
- Prevent long commands, URLs, and identifiers from causing page overflow.
- Keep touch targets usable on mobile.
- Do not add client JavaScript outside the mobile menu, search, and code-copy behavior.
- Preserve RSS, canonical URLs, social metadata, sitemap, and draft exclusion.

## Verification

GitHub Actions and local verification must cover:

1. Content-schema acceptance and rejection cases
2. Draft exclusion from routes, Pagefind, RSS, and sitemap
3. Primary topic and MCP-label validation
4. Astro type and content checks
5. Production build for a GitHub repository subpath
6. Production build for a custom-domain root path
7. Pagefind artifact and base-path correctness
8. Internal links and fragment targets
9. Header, topic, Articles, About, RSS, and article routes
10. Empty-topic and empty-search states
11. Keyboard navigation and visible focus
12. Accessibility checks on core pages and an article
13. Mobile layouts, long-token containment, and no horizontal overflow
14. GitHub Pages artifact contents

Removed Buttondown, Giscus, Learning paths, Vercel, and advanced-filter tests must be deleted or replaced rather than skipped.

## Completion Criteria

The redesign is complete when:

- The approved RHDS editorial-minimal design is implemented across all routes.
- The three primary topics and the corrected `mcp-lifecycle-operator` label are enforced in content validation.
- Newsletter, comments, Learning paths, terminal status, advanced filters, and Vercel code are absent.
- GitHub Pages deployment configuration works for a repository subpath and documents custom-domain use.
- Local and GitHub Actions verification pass.
- The production preview is ready for Li's visual review.

## Official References

- [Red Hat Design System typography guidelines](https://ux.redhat.com/foundations/typography/guidelines/)
- [Red Hat Design System CSS foundations](https://ux.redhat.com/get-started/developers/css-foundations/)
- [Red Hat Design System color tokens](https://ux.redhat.com/tokens/color/)
- [Red Hat Design System grid](https://ux.redhat.com/foundations/grid/)
- [Red Hat Design System spacing](https://ux.redhat.com/foundations/spacing/)
- [Astro GitHub Pages deployment guide](https://docs.astro.build/en/guides/deploy/github/)
- [GitHub Pages custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
