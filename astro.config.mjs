import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } }
});
