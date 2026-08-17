import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { isProductionBuild, resolveBasePath, resolveSiteUrl } from './src/config/site-url.mjs';

const production = isProductionBuild();
export default defineConfig({
  site: resolveSiteUrl(process.env.PUBLIC_SITE_URL, { production }),
  base: resolveBasePath(process.env.PUBLIC_BASE_PATH),
  output: 'static',
  integrations: [mdx(), sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } }
});
