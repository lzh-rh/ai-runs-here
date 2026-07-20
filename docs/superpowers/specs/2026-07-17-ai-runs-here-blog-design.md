# AI Runs Here Blog Design

## Purpose

Build a modern personal technical blog for an Applied AI-focused Technical Marketing Manager working with OpenShift. The site converts hands-on labs, experiments, troubleshooting notes, and concept explanations into material that practitioners can understand and follow.

The site is an independent personal publication. It may discuss Red Hat products, but it must not imply that it is an official Red Hat publication.

## Identity

- **Title:** AI Runs Here
- **Subtitle:** Applied AI on OpenShift
- **Editorial promise:** Tested labs, useful diagrams, and honest notes from the terminal.
- **Audience:** Developers, platform engineers, technical sellers, customers, and curious beginners learning how Applied AI works on OpenShift.
- **Voice:** Practical, approachable, accurate, and transparent about what was tested.

## Technical Approach

Use Astro with TypeScript and Astro Content Collections. Publish to Vercel. Store posts as Markdown or MDX in the Git repository.

This approach is preferred over Next.js because the product is primarily a content site and does not need a custom application backend. It is preferred over Eleventy because Astro offers a stronger typed-content workflow and simpler support for selective interactive components.

### Integrations

- Pagefind for static, client-side search
- Giscus for GitHub Discussions-backed comments
- Buttondown for newsletter subscriptions
- Astro sitemap and RSS generation
- Syntax highlighting and copy-code controls

The first release has no custom database, account system, analytics tracker, or custom admin dashboard.

## Information Architecture

### Home

The homepage contains:

1. A concise thesis hero: “Applied AI, step by step.”
2. A current-experiment terminal status panel
3. Topic entry points for OpenShift AI, Agentic AI, MCP, and Lightspeed
4. A featured article and recent field notes
5. Learning-path entry points
6. A newsletter subscription prompt

### Articles

The articles index supports full-text search and filters for topic and difficulty. Results remain fully client-side and require no database.

### Learning Paths

Learning paths are curated ordered sequences of posts. The initial supported path identifiers are “Start with OpenShift AI,” “Agentic AI,” and “MCP.” A path appears in navigation only after it contains at least one published post.

### About

The About page explains Li's role, the learning-through-building approach, and the site's personal and unofficial status.

### Article Page

An article can include:

- Summary and metadata
- Prerequisites
- Tested product and platform versions
- Table of contents
- Commands, code, diagrams, and screenshots
- Verification steps
- Troubleshooting notes
- References
- Previous and next learning-path links
- Related posts
- Giscus comments

## Content Model

Posts live under `src/content/posts/`. Each post has validated frontmatter:

- `title`: display title
- `description`: short summary for listings and search
- `publishedDate`: original publication date
- `updatedDate`: optional latest material update
- `topic`: one controlled topic value
- `tags`: optional supporting labels
- `difficulty`: `beginner`, `intermediate`, or `advanced`
- `estimatedMinutes`: positive reading or completion time
- `testedVersions`: product names and exact versions used in the lab
- `prerequisites`: optional short list
- `draft`: whether the post is excluded from production
- `featured`: whether it may occupy the homepage feature slot
- `learningPath`: optional path identifier and sequence position
- `image`: optional social preview or hero image

A draft remains hidden from production pages, feeds, sitemap, and search. Deleting a post file removes it at the next deployment. Editing a post and pushing the commit triggers a Vercel rebuild.

Images may live beside a post when they are specific to that article. Shared brand and interface assets live under `public/`.

## Visual Direction

The approved direction is **Modern Lab Manual**: structured, technical, calm, and personal.

### Palette

- Cluster green — `#143E33`: navigation, primary text, primary actions
- Signal lime — `#C9F36A`: verified states and focused highlights
- Lab paper — `#F1F6F1`: page background
- Equipment wash — `#E5EEE6`: secondary panels
- Rule green — `#9DB4A6`: borders and structural separators
- White — `#FFFFFF`: article surfaces

### Typography

- Display: a condensed sans serif for hero statements and major section headings
- Body: a highly legible humanist sans serif
- Utility: a monospace face for commands, version labels, metadata, and status output

The implementation must select web-safe or self-hostable open-source fonts that preserve these roles without requiring a paid service.

### Layout

The desktop homepage uses a bordered lab-manual frame, a split thesis hero, a four-topic rail, and an asymmetrical article grid. Mobile collapses these regions into a single reading column while preserving topic access and metadata.

### Signature Element

The memorable visual element is a terminal-status panel that represents the current experiment and uses a verified state. It is content-bearing rather than decorative. It must not imply that a lab passed unless the associated content was actually verified.

Decoration stays restrained: no generic AI brain imagery, gratuitous gradients, or scattered animation. Motion is limited to purposeful entrance or hover behavior and must respect reduced-motion preferences.

## Interaction and Failure Behavior

- Search shows a helpful empty state with suggestions to remove filters or try another term.
- Newsletter submission preserves the entered address on failure and provides a clear retry message.
- If Buttondown is not configured, local development shows an explicit setup notice and production configuration fails validation rather than silently rendering a broken form.
- If Giscus is unavailable, the comments region shows a small unavailable message; the article remains readable.
- Copy-code controls announce success to assistive technology and revert to their original label.
- Missing related posts or learning-path neighbors simply omit those regions.
- Invalid frontmatter fails the build with a file-specific validation error.

## Discoverability

The site includes canonical URLs, structured metadata, sitemap, RSS, Open Graph metadata, social preview images, semantic headings, descriptive page titles, and useful descriptions. Published posts appear in search, feeds, and the sitemap; drafts never do.

## Accessibility and Responsive Requirements

- Semantic landmarks and heading order
- Full keyboard operation
- Visible focus states
- Sufficient text and interface contrast
- Descriptive link and control labels
- Reduced-motion support
- Responsive behavior at narrow mobile, tablet, laptop, and wide desktop sizes
- Code blocks that scroll without breaking the page width
- Touch targets suitable for mobile use

## Verification

Before release, verify:

1. Type checks and production build pass.
2. Content schema accepts a representative MDX article and rejects invalid metadata.
3. Drafts are absent from pages, Pagefind, RSS, and sitemap output.
4. Internal links are valid.
5. Search and filters work together and have useful empty states.
6. Newsletter success, validation, and failure states render correctly.
7. Giscus loads when configured and fails gracefully when unavailable.
8. Keyboard navigation, focus visibility, heading structure, and contrast meet accessibility expectations.
9. Responsive screenshots match the approved hierarchy at mobile and desktop widths.
10. Social, RSS, canonical, and sitemap metadata use the deployed site URL.

## Deployment and Configuration

Vercel deploys the production build from the Git repository. Required public configuration includes the canonical site URL, Buttondown form endpoint, and Giscus repository metadata. Secrets, if any integration later requires them, must be stored in Vercel environment variables and never committed.

The project README will document how to:

- Install and run the site locally
- Create, preview, publish, update, draft, and delete a post
- Configure Vercel, Buttondown, and Giscus
- Add a topic or learning path
- Run verification checks

## Completion Criteria

The first release is complete when the approved responsive design is implemented, at least one representative lab post demonstrates the complete article format, content management works through Markdown or MDX and Git, all required integrations have documented configuration and graceful fallbacks, verification passes, and the site is ready to connect to a Vercel project.
