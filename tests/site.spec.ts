import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { resolveBasePath } from '../src/config/site-url.mjs';

const browserBasePath = resolveBasePath(
  process.env.PLAYWRIGHT_BASE_PATH ?? process.env.PUBLIC_BASE_PATH
);
const pagePath = (path = '/') => `${browserBasePath}${path.replace(/^\/+/, '')}`;

test('initial search state keeps the published article list visible', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
  await expect(page.locator('[data-static-article-list]')).toBeVisible();
  await expect(page.locator('[data-search-results]')).toBeHidden();
});

test('production excludes draft articles and draft-preview badges', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toHaveCount(0);
  await expect(page.getByText('Draft preview')).toHaveCount(0);
});

test('home exposes exactly the three primary topic links', async ({ page }) => {
  await page.goto(pagePath('/'));
  const main = page.locator('main');
  for (const [name, href] of [
    ['OpenShift Lightspeed', pagePath('/topics/openshift-lightspeed/')],
    ['Agentic Lightspeed', pagePath('/topics/agentic-lightspeed/')],
    ['MCP', pagePath('/topics/mcp/')]
  ] as const) {
    const topicLink = main.getByRole('link', { name, exact: true });
    await expect(topicLink).toHaveCount(1);
    await expect(topicLink).toHaveAttribute('href', href);
  }
  await expect(page.getByText('Learning paths')).toHaveCount(0);
  await expect(page.getByText(/newsletter/i)).toHaveCount(0);
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
    '/sitemap-index.xml',
    '/pagefind/pagefind.js'
  ]) {
    expect((await request.get(pagePath(path))).status(), path).toBe(200);
  }

  const internalLinks: string[] = [];
  for (const path of ['/', '/articles/start-learning-applied-ai-on-openshift/']) {
    await page.goto(pagePath(path));
    internalLinks.push(...await page.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href))
    ));
  }
  const baseSegment = browserBasePath.replace(/^\/+|\/+$/g, '');
  for (const href of internalLinks) {
    expect(href.startsWith(browserBasePath), href).toBe(true);
    if (baseSegment) expect(href.startsWith(`${browserBasePath}${baseSegment}/`), href).toBe(false);
    const target = new URL(href, 'https://internal.example');
    expect((await request.get(`${target.pathname}${target.search}`)).status(), href).toBeLessThan(400);
  }
});

test('home intro uses the shared section spacing at desktop and mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(pagePath('/'));
  const homeIntro = page.locator('.home-intro');

  await expect(homeIntro).toHaveCSS('padding-top', '64px');
  await expect(homeIntro).toHaveCSS('padding-bottom', '64px');

  await page.setViewportSize({ width: 375, height: 800 });
  await expect(homeIntro).toHaveCSS('padding-top', '40px');
  await expect(homeIntro).toHaveCSS('padding-bottom', '40px');
});

test('every topic route has a title and article or empty state', async ({ page }) => {
  for (const slug of ['openshift-lightspeed', 'agentic-lightspeed', 'mcp']) {
    await page.goto(pagePath(`/topics/${slug}/`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-topic-article-list], [data-topic-empty]')).toBeVisible();
  }
});

test('site identifies itself as personal and unofficial', async ({ page }) => {
  await page.goto(pagePath('/about/'));
  await expect(page.getByText(/Li is a Technical Marketing Manager focused on Applied AI in OpenShift/i)).toBeVisible();
  await expect(page.getByText(/not an official Red Hat website/i)).toBeVisible();
});

test('mobile navigation reports and closes its expanded state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(pagePath('/'));

  const menuButton = page.getByRole('button', { name: 'Menu' });
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();
  const articlesLink = page.getByRole('link', { name: 'Articles / Search', exact: true });
  await articlesLink.evaluate((link) => {
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
  });
  await articlesLink.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
});

test('articles page exposes one search input and no advanced filters', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toBeVisible();
  await expect(page.getByLabel('Topic')).toHaveCount(0);
  await expect(page.getByLabel('Difficulty')).toHaveCount(0);
});

test('search returns article metadata and can be cleared', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await page.getByRole('searchbox', { name: 'Search articles' }).fill('evidence');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.locator('[data-search-results]').getByText('OpenShift Lightspeed')).toBeVisible();
  const resultLink = page.locator('[data-search-results]').getByRole('link', { name: /Start learning Applied AI/ });
  await expect(resultLink).toHaveAttribute('href');
  expect(new URL((await resultLink.getAttribute('href')) ?? '').pathname).toBe(
    pagePath('/articles/start-learning-applied-ai-on-openshift/')
  );

  await page.getByRole('searchbox', { name: 'Search articles' }).clear();
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
});

test('static articles remain available when search cannot load', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.goto(pagePath('/articles/'));
  await page.getByRole('searchbox', { name: 'Search articles' }).fill('evidence');
  await expect(page.getByText('Search is unavailable. Browse all articles below.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
});

test('removed routes are absent', async ({ request }) => {
  expect((await request.get(pagePath('/learning-paths/'))).status()).toBe(404);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('offers the published article list directly', async ({ page }) => {
    await page.goto(pagePath('/articles/'));
    await expect(page.getByText('Browse all articles below.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
  });
});

test('core pages have no serious accessibility violations', async ({ page }) => {
  for (const path of [
    '/',
    '/articles/',
    '/about/',
    '/articles/start-learning-applied-ai-on-openshift/'
  ]) {
    await page.goto(pagePath(path));
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(
      result.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))
    ).toEqual([]);
  }
});

test('keyboard users can reach main content and navigation', async ({ browserName, page }) => {
  await page.goto(pagePath('/'));
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mobile page does not overflow horizontally', async ({ page }) => {
  await page.goto(pagePath('/articles/start-learning-applied-ai-on-openshift/'));
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});

test('long prose and code tokens stay contained at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(pagePath('/articles/start-learning-applied-ai-on-openshift/'));
  const token = 'x'.repeat(426);

  for (const markup of [
    `<p>${token}</p>`,
    `<p><code>${token}</code></p>`,
    `<pre><code>${token}</code></pre>`
  ]) {
    const widths = await page.locator('.article-prose').evaluate((prose, html) => {
      prose.insertAdjacentHTML('beforeend', html);
      return {
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        prose: prose.scrollWidth
      };
    }, markup);

    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
    expect(widths.prose).toBeLessThanOrEqual(widths.viewport);
  }
});
