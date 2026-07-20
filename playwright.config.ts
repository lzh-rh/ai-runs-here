import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const publicSiteUrl = process.env.PUBLIC_SITE_URL ?? 'https://example.com';
const buttondownUsername = process.env.PUBLIC_BUTTONDOWN_USERNAME ?? 'test';

export default defineConfig({
  testMatch: '**/*.spec.ts',
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    env: {
      PUBLIC_BUTTONDOWN_USERNAME: buttondownUsername,
      PUBLIC_SITE_URL: publicSiteUrl,
      PUBLIC_GISCUS_REPO: process.env.PUBLIC_GISCUS_REPO ?? 'example/ai-runs-here',
      PUBLIC_GISCUS_REPO_ID: process.env.PUBLIC_GISCUS_REPO_ID ?? 'test-repository-id',
      PUBLIC_GISCUS_CATEGORY: process.env.PUBLIC_GISCUS_CATEGORY ?? 'Announcements',
      PUBLIC_GISCUS_CATEGORY_ID: process.env.PUBLIC_GISCUS_CATEGORY_ID ?? 'test-category-id'
    },
    port,
    reuseExistingServer: false
  },
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ]
});
