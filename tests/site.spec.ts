import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { resolveBasePath } from '../src/config/site-url.mjs';

const browserBasePath = resolveBasePath(
  process.env.PLAYWRIGHT_BASE_PATH ?? process.env.PUBLIC_BASE_PATH
);
const pagePath = (path = '/') => `${browserBasePath}${path.replace(/^\/+/, '')}`;

test('article uses the simple documentation shell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/'));

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
  await expect(contents.getByRole('link', { name: 'Prepare your environment' }))
    .toHaveAttribute('href', '#prepare-your-environment');
  await expect(page.locator('.docs-content article h1')).toHaveText(
    'How Agentic troubleshooting works in OpenShift'
  );
});

test('header uses the supplied Red Hat identity pattern', async ({ page }) => {
  await page.goto(pagePath('/'));

  const brand = page.getByRole('link', { name: 'AI Runs Here home' });
  await expect(brand.locator('img.site-brand__icon')).toHaveAttribute(
    'src',
    pagePath('/red-hat-icon.png')
  );
  await expect(brand.locator('.site-brand__divider')).toBeVisible();
  await expect(brand.getByText('AI Runs Here', { exact: true })).toBeVisible();
  await expect(brand.getByText('Applied AI on OpenShift', { exact: true })).toBeVisible();
});

test('pages omit the visible publication footer', async ({ page }) => {
  await page.goto(pagePath('/'));

  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(page.getByText('personal and unofficial learning publication')).toHaveCount(0);
});

test('article presents source-backed learning aids as structured content', async ({ page }) => {
  await page.goto(pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/'));

  await expect(page.getByRole('heading', { level: 2, name: 'What you will learn' })).toBeVisible();
  await expect(page.locator('.article-callout--checkpoint')).toHaveCount(3);
  await expect(page.locator('.article-callout--caution')).toContainText(
    'Enabling a receiver can create runs for multiple eligible alerts.'
  );
  await expect(page.getByText('OpenShift 5.0.0-ec.6', { exact: true })).toBeVisible();
  await expect(page.locator('.article-callout--important')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'investigate-alert', exact: true }).locator('code')
  ).toHaveCount(0);
  await expect(page.locator('strong code').filter({ hasText: 'AgenticRun' })).toHaveCount(0);

  const workflow = page.getByRole('figure', { name: 'Alert-triggered Agentic troubleshooting flow' });
  await expect(workflow).toBeVisible();
  await expect(workflow.locator('[data-workflow-step]')).toHaveCount(7);
});

test('article exposes its table of contents on mobile without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/'));

  const disclosure = page.locator('details.article-toc-mobile');
  await expect(disclosure).toBeVisible();
  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator('summary').click();
  await expect(disclosure.getByRole('link', { name: 'Prepare your environment' }))
    .toHaveAttribute('href', '#prepare-your-environment');
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

test('MCP topics appear as flat navigation links without parent sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(pagePath('/'));
  const navigation = page.getByRole('navigation', { name: 'Topic navigation' }).first();

  await expect(navigation.getByRole('link', { name: 'MCP', exact: true })).toHaveCount(0);
  await expect(navigation.getByText('MCP topics', { exact: true })).toHaveCount(0);
  for (const [name, path] of [
    ['MCP Gateway', '/topics/mcp-gateway/'],
    ['MCP Server', '/topics/mcp-server/'],
    ['MCP Lifecycle Operator', '/topics/mcp-lifecycle-operator/']
  ] as const) {
    await expect(navigation.getByRole('link', { name, exact: true }))
      .toHaveAttribute('href', pagePath(path));
  }
});

test('articles page is a plain chronological list without search', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.locator('h1')).toHaveText('Articles');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'How Agentic troubleshooting works in OpenShift' })).toBeVisible();
});

test('About section and route are removed', async ({ page, request }) => {
  await page.goto(pagePath('/'));
  await expect(page.getByRole('link', { name: /about/i })).toHaveCount(0);
  expect((await request.get(pagePath('/about/'))).status()).toBe(404);
});

test('simple build does not ship a search runtime', async ({ request }) => {
  expect((await request.get(pagePath('/pagefind/pagefind.js'))).status()).toBe(404);
});

test('breadcrumbs use the configured site base', async ({ page }) => {
  await page.goto(pagePath('/articles/'));
  await expect(page.locator('.breadcrumb').getByRole('link', { name: 'Home' }))
    .toHaveAttribute('href', pagePath('/'));
});

test('home exposes the two Lightspeed and three MCP topic links', async ({ page }) => {
  await page.goto(pagePath('/'));
  const main = page.locator('main');
  const links = main.locator(`a[href^="${pagePath('/topics/')}"]`);
  await expect(links).toHaveCount(5);
  for (const [name, href] of [
    ['OpenShift Lightspeed', '/topics/openshift-lightspeed/'],
    ['Agentic Lightspeed', '/topics/agentic-lightspeed/'],
    ['MCP Gateway', '/topics/mcp-gateway/'],
    ['MCP Server', '/topics/mcp-server/'],
    ['MCP Lifecycle Operator', '/topics/mcp-lifecycle-operator/']
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
    '/topics/mcp-gateway/',
    '/articles/how-agentic-troubleshooting-works-in-openshift/',
    '/rss.xml',
    '/sitemap-index.xml'
  ]) {
    expect((await request.get(pagePath(path))).status(), path).toBe(200);
  }

  for (const path of ['/', '/articles/how-agentic-troubleshooting-works-in-openshift/']) {
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
  for (const slug of [
    'openshift-lightspeed',
    'agentic-lightspeed',
    'mcp-gateway',
    'mcp-server',
    'mcp-lifecycle-operator'
  ]) {
    await page.goto(pagePath(`/topics/${slug}/`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator(
      '[data-topic-article-list], [data-topic-empty], [data-mcp-article-list], [data-mcp-empty]'
    ).first()).toBeVisible();
  }
});

test('MCP areas are separate top-level topic pages', async ({ page, request }) => {
  for (const [slug, title, description] of [
    [
      'mcp-gateway',
      'MCP Gateway',
      'A Kuadrant-based application gateway that handles connectivity and management of MCP servers for MCP clients.'
    ],
    [
      'mcp-server',
      'MCP Server',
      'A native Go MCP server that bridges AI assistants to Kubernetes and OpenShift clusters through the Model Context Protocol.'
    ],
    [
      'mcp-lifecycle-operator',
      'MCP Lifecycle Operator',
      'A Kubernetes-native operator that manages the deployment and lifecycle of MCP servers on OpenShift.'
    ]
  ] as const) {
    const path = pagePath(`/topics/${slug}/`);
    expect((await request.get(path)).status(), path).toBe(200);
    await page.goto(path);
    await expect(page.getByText('Topic', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    await expect(page.locator('[data-topic-article-list], [data-topic-empty]')).toBeVisible();
  }

  expect((await request.get(pagePath('/topics/mcp/'))).status()).toBe(404);
});

test('published output includes the Agentic lab', async ({ page }) => {
  await page.goto(pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/'));
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'How Agentic troubleshooting works in OpenShift'
  })).toBeVisible();
});

test('Agentic troubleshooting is the first published blog article', async ({ page, request }) => {
  const articlePath = pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/');
  await page.goto(articlePath);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'How Agentic troubleshooting works in OpenShift'
  })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prepare your environment' }))
    .toHaveAttribute('id', 'prepare-your-environment');
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Prepare your environment' }))
      .toHaveAttribute('href', '#prepare-your-environment');
  }

  await page.goto(pagePath('/articles/'));
  await expect(page.getByRole('link', { name: 'How Agentic troubleshooting works in OpenShift' }))
    .toHaveAttribute('href', articlePath);
  expect((await request.get(pagePath('/articles/start-learning-applied-ai-on-openshift/'))).status())
    .toBe(404);
});

test('RSS and sitemap expose only published routes', async ({ request }) => {
  const published = pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/');
  const rss = await request.get(pagePath('/rss.xml'));
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain(published);
  const sitemap = await request.get(pagePath('/sitemap-0.xml'));
  expect(await sitemap.text()).toContain(published);
});

test('removed route and integrations are absent', async ({ page, request }) => {
  const removedRoute = `/${['learning', 'paths'].join('-')}/`;
  expect((await request.get(pagePath(removedRoute))).status()).toBe(404);
  for (const path of ['/', '/articles/how-agentic-troubleshooting-works-in-openshift/']) {
    await page.goto(pagePath(path));
    await expect(page.locator('form, iframe')).toHaveCount(0);
  }
});

test('core pages have no serious accessibility violations', async ({ page }) => {
  for (const path of [
    '/', '/articles/', '/topics/openshift-lightspeed/', '/topics/agentic-lightspeed/',
    '/topics/mcp-gateway/', '/articles/how-agentic-troubleshooting-works-in-openshift/'
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
    for (const path of ['/', '/topics/mcp-gateway/', '/articles/', '/articles/how-agentic-troubleshooting-works-in-openshift/']) {
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
  await page.goto(pagePath('/articles/how-agentic-troubleshooting-works-in-openshift/'));
  const token = 'x'.repeat(426);
  for (const markup of [`<p>${token}</p>`, `<p><code>${token}</code></p>`, `<pre><code>${token}</code></pre>`]) {
    const widths = await page.locator('.article-prose').evaluate((prose, html) => {
      prose.insertAdjacentHTML('beforeend', html);
      return { viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth };
    }, markup);
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  }
});
