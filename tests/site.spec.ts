import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { resolveBasePath } from '../src/config/site-url.mjs';

const browserBasePath = resolveBasePath(
  process.env.PLAYWRIGHT_BASE_PATH ?? process.env.PUBLIC_BASE_PATH
);
const pagePath = (path = '/') => `${browserBasePath}${path.replace(/^\/+/, '')}`;

test('article uses the simple documentation shell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(pagePath('/articles/start-learning-applied-ai-on-openshift/'));

  await expect(page.getByRole('banner').getByText('AI Runs Here')).toBeVisible();
  const topicNavigation = page.getByRole('navigation', { name: 'Topic navigation' }).first();
  for (const name of [
    'OpenShift Lightspeed',
    'Agentic Lightspeed',
    'MCP Gateway',
    'MCP Server',
    'MCP Lifecycle Operator'
  ]) {
    await expect(topicNavigation.getByRole('link', { name, exact: true })).toBeVisible();
  }

  const contents = page.getByRole('navigation', { name: 'On this page' });
  await expect(contents.getByRole('link', { name: 'Start with the evidence state' }))
    .toHaveAttribute('href', '#start-with-the-evidence-state');
  await expect(page.locator('.docs-content article h1')).toHaveText(
    'Start learning Applied AI on OpenShift'
  );
});

test('mobile uses native topic disclosure without a scripted menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(pagePath('/'));

  const disclosure = page.locator('details.mobile-topics');
  await expect(disclosure.getByText('Topics', { exact: true })).toBeVisible();
  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure.getByRole('link', { name: 'MCP Server', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);
});

test('articles page is a plain chronological list without search', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.locator('h1')).toHaveText('Articles');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
});

test('simple build does not ship a search runtime', async ({ request }) => {
  expect((await request.get(pagePath('/pagefind/pagefind.js'))).status()).toBe(404);
});

test('breadcrumbs use the configured site base', async ({ page }) => {
  for (const path of ['/articles/', '/about/']) {
    await page.goto(pagePath(path));
    await expect(page.locator('.breadcrumb').getByRole('link', { name: 'Home' }))
      .toHaveAttribute('href', pagePath('/'));
  }
});

test('home exposes exactly the three primary topic links', async ({ page }) => {
  await page.goto(pagePath('/'));
  const main = page.locator('main');
  const links = main.locator(`a[href^="${pagePath('/topics/')}"]`);
  await expect(links).toHaveCount(3);
  for (const [name, href] of [
    ['OpenShift Lightspeed', '/topics/openshift-lightspeed/'],
    ['Agentic Lightspeed', '/topics/agentic-lightspeed/'],
    ['MCP', '/topics/mcp/']
  ] as const) {
    await expect(main.getByRole('link', { name, exact: true })).toHaveAttribute('href', pagePath(href));
  }
});

test('deployment routes, metadata, and internal links use the configured base once', async ({ page, request }) => {
  await page.goto(pagePath('/'));
  await expect(page.getByRole('link', { name: 'AI Runs Here home' })).toHaveAttribute('href', pagePath('/'));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${process.env.PUBLIC_SITE_URL ?? 'https://example.com'}${pagePath('/')}`
  );

  for (const path of [
    '/topics/mcp/',
    '/articles/start-learning-applied-ai-on-openshift/',
    '/rss.xml',
    '/sitemap-index.xml'
  ]) {
    expect((await request.get(pagePath(path))).status(), path).toBe(200);
  }

  for (const path of ['/', '/articles/start-learning-applied-ai-on-openshift/']) {
    await page.goto(pagePath(path));
    const internalLinks = await page.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href))
    );
    for (const href of internalLinks) {
      expect(href.startsWith(browserBasePath), href).toBe(true);
      const target = new URL(href, 'https://internal.example');
      expect((await request.get(target.pathname)).status(), href).toBeLessThan(400);
    }
  }
});

test('topic routes show a title and article list or empty state', async ({ page }) => {
  for (const slug of ['openshift-lightspeed', 'agentic-lightspeed', 'mcp']) {
    await page.goto(pagePath(`/topics/${slug}/`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-topic-article-list], [data-topic-empty]')).toBeVisible();
  }
});

test('MCP navigation targets the three topic sections', async ({ page }) => {
  await page.goto(pagePath('/topics/mcp/'));
  for (const [name, id] of [
    ['MCP Gateway', 'mcp-gateway'],
    ['MCP Server', 'mcp-server'],
    ['MCP Lifecycle Operator', 'mcp-lifecycle-operator']
  ] as const) {
    await expect(page.locator(`#${id}`)).toContainText(name);
  }
});

test('site identifies itself as personal and unofficial', async ({ page }) => {
  await page.goto(pagePath('/about/'));
  await expect(page.getByText(/Li is a Technical Marketing Manager focused on Applied AI in OpenShift/i)).toBeVisible();
  await expect(page.getByText(/not an official Red Hat website/i)).toBeVisible();
});

test('published output includes the guide and excludes the draft', async ({ page, request }) => {
  await page.goto(pagePath('/articles/start-learning-applied-ai-on-openshift/'));
  await expect(page.locator('h1')).toHaveText('Start learning Applied AI on OpenShift');
  expect((await request.get(pagePath('/articles/connect-mcp-server-to-lightspeed/'))).status()).toBe(404);
});

test('RSS and sitemap expose only published routes', async ({ request }) => {
  const published = pagePath('/articles/start-learning-applied-ai-on-openshift/');
  const rss = await request.get(pagePath('/rss.xml'));
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain(published);
  expect(await rss.text()).not.toContain('connect-mcp-server-to-lightspeed');
  const sitemap = await request.get(pagePath('/sitemap-0.xml'));
  expect(await sitemap.text()).toContain(published);
  expect(await sitemap.text()).not.toContain('connect-mcp-server-to-lightspeed');
});

test('removed route and integrations are absent', async ({ page, request }) => {
  const removedRoute = `/${['learning', 'paths'].join('-')}/`;
  expect((await request.get(pagePath(removedRoute))).status()).toBe(404);
  for (const path of ['/', '/articles/start-learning-applied-ai-on-openshift/']) {
    await page.goto(pagePath(path));
    await expect(page.locator('form, iframe')).toHaveCount(0);
  }
});

test('core pages have no serious accessibility violations', async ({ page }) => {
  for (const path of [
    '/', '/articles/', '/topics/openshift-lightspeed/', '/topics/agentic-lightspeed/',
    '/topics/mcp/', '/about/', '/articles/start-learning-applied-ai-on-openshift/'
  ]) {
    await page.goto(pagePath(path));
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
});

test('keyboard users can reach main content', async ({ browserName, page }) => {
  await page.goto(pagePath('/'));
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('key pages do not overflow at common widths', async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/topics/mcp/', '/articles/', '/about/', '/articles/start-learning-applied-ai-on-openshift/']) {
      await page.goto(pagePath(path));
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth
      }));
      expect(widths.document, `${width}px ${path}`).toBeLessThanOrEqual(widths.viewport);
    }
  }
});

test('long prose and code tokens stay contained at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(pagePath('/articles/start-learning-applied-ai-on-openshift/'));
  const token = 'x'.repeat(426);
  for (const markup of [`<p>${token}</p>`, `<p><code>${token}</code></p>`, `<pre><code>${token}</code></pre>`]) {
    const widths = await page.locator('.article-prose').evaluate((prose, html) => {
      prose.insertAdjacentHTML('beforeend', html);
      return { viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth };
    }, markup);
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  }
});
