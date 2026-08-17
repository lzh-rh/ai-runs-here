import { defineConfig, devices } from '@playwright/test';
import { resolveBasePath } from './src/config/site-url.mjs';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const publicSiteUrl = process.env.PUBLIC_SITE_URL ?? 'https://example.com';
const publicBasePath = resolveBasePath(process.env.PUBLIC_BASE_PATH);

export default defineConfig({
  testMatch: '**/*.spec.ts',
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    env: {
      PUBLIC_SITE_URL: publicSiteUrl,
      PUBLIC_BASE_PATH: publicBasePath
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
