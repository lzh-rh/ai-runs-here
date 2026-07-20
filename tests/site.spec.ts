import { expect, test } from '@playwright/test';

test('initial search state keeps the published article list visible', async ({ page }) => {
  await page.goto('/articles/');
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
  await expect(page.locator('[data-static-article-list]')).toBeVisible();
  await expect(page.locator('[data-search-results]')).toBeHidden();
});

test('clearing every search control restores the published article list', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('Lightspeed');
  await expect(page.getByText('1 article found.')).toBeVisible();

  await page.getByLabel('Search articles').clear();
  await expect(page.getByText('Browse all articles below.')).toBeVisible();
  await expect(page.locator('[data-static-article-list]')).toBeVisible();
  await expect(page.locator('[data-search-results]')).toBeHidden();
});

test('search finds the MCP lab and filters by difficulty', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('Lightspeed');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
  await page.getByLabel('Difficulty').selectOption('advanced');
  await expect(page.getByText('Try another term or remove a filter.')).toBeVisible();
  await page.getByLabel('Difficulty').selectOption('intermediate');
  await expect(page.getByText('1 article found.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
});

test('empty result gives useful recovery guidance', async ({ page }) => {
  await page.goto('/articles/');
  await page.getByLabel('Difficulty').selectOption('advanced');
  await expect(page.getByText('Try another term or remove a filter.')).toBeVisible();
});

test('topic query preselects the filter and filter changes update the URL', async ({ page }) => {
  await page.goto('/articles/?topic=mcp');
  await expect(page.getByLabel('Topic')).toHaveValue('mcp');
  await page.getByLabel('Topic').selectOption('lightspeed');
  await expect(page).toHaveURL(/topic=lightspeed/);
});

test('static articles remain available when search cannot load', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.goto('/articles/');
  await page.getByLabel('Search articles').fill('Lightspeed');
  await expect(page.getByText('Search is unavailable; browse all articles below.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('offers the published article list directly', async ({ page }) => {
    await page.goto('/articles/');
    await expect(page.getByText('Browse all articles below.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Connect an MCP server/ })).toBeVisible();
  });
});
