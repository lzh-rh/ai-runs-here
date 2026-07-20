import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { isProductionBuild, resolveSiteUrl } from './src/config/site-url.mjs';

export default defineConfig({
  site: resolveSiteUrl(process.env.PUBLIC_SITE_URL, { production: isProductionBuild() }),
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } }
});
