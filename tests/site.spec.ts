import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('initial search state keeps the published article list visible', async ({ page }) => {
  await page.goto('/articles/');
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
  await expect(page.locator('[data-static-article-list]')).toBeVisible();
  await expect(page.locator('[data-search-results]')).toBeHidden();
});

test('production excludes draft articles and draft-preview badges', async ({ page }) => {
  await page.goto('/articles/');
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toHaveCount(0);
  await expect(page.getByText('Draft preview')).toHaveCount(0);
});

test('home omits removed integrations, learning paths, terminal status, and card grids', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Lab notes by email')).toHaveCount(0);
  await expect(page.getByText('Current bench note')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Learning paths' })).toHaveCount(0);
  await expect(page.locator('.post-grid')).toHaveCount(0);
});

test('clearing every search control restores the published article list', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('evidence');
  await expect(page.getByText('1 article found.')).toBeVisible();

  await page.getByLabel('Search articles').clear();
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
  await expect(page.locator('[data-static-article-list]')).toBeVisible();
  await expect(page.locator('[data-search-results]')).toBeHidden();
});

test('search finds the published reading guide and filters by difficulty', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('evidence');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
  await page.getByLabel('Difficulty').selectOption('advanced');
  await expect(page.getByText('Try another term or remove a filter.')).toBeVisible();
  await page.getByLabel('Difficulty').selectOption('beginner');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
});

test('topic, difficulty, and combined filters return articles without a text query', async ({ page }) => {
  await page.goto('/articles/');

  await page.getByLabel('Topic').selectOption('openshift-ai');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();

  await page.getByLabel('Difficulty').selectOption('beginner');
  await expect(page.getByText('1 article found.')).toBeVisible();

  await page.getByLabel('Topic').selectOption('lightspeed');
  await expect(page.getByText('0 articles found.')).toBeVisible();
});

test('empty result gives useful recovery guidance', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Difficulty').selectOption('advanced');
  await expect(page.getByText('Try another term or remove a filter.')).toBeVisible();
});

test('topic query preselects the filter and filter changes update the URL', async ({ page }) => {
  await page.goto('/articles/?topic=openshift-ai');
  await expect(page.getByLabel('Topic')).toHaveValue('openshift-ai');
  await page.getByLabel('Topic').selectOption('lightspeed');
  await expect(page).toHaveURL(/topic=lightspeed/);
});

test('difficulty query state survives direct load, reload, and back-forward navigation', async ({ page }) => {
  await page.goto('/articles/?topic=openshift-ai&difficulty=beginner');
  await expect(page.getByLabel('Topic')).toHaveValue('openshift-ai');
  await expect(page.getByLabel('Difficulty')).toHaveValue('beginner');
  await expect(page.getByText('1 article found.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Difficulty')).toHaveValue('beginner');
  await expect(page.getByText('1 article found.')).toBeVisible();

  await page.goto('/about/');
  await page.goBack();
  await expect(page.getByLabel('Difficulty')).toHaveValue('beginner');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.goBack();
  await expect(page.getByLabel('Difficulty')).toHaveValue('beginner');
});

test('static articles remain available when search cannot load', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('evidence');
  await expect(page.getByText('Search is unavailable; browse all articles below.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning Applied AI/ })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('offers the published article list directly', async ({ page }) => {
    await page.goto('/articles/');
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
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(
      result.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))
    ).toEqual([]);
  }
});

test('keyboard users can reach main content and navigation', async ({ browserName, page }) => {
  await page.goto('/');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mobile page does not overflow horizontally', async ({ page }) => {
  await page.goto('/articles/start-learning-applied-ai-on-openshift/');
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});

test('long prose and code tokens stay contained at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/articles/start-learning-applied-ai-on-openshift/');
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
