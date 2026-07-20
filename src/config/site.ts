import type { Topic } from '../content.config';

export const siteConfig = {
  title: 'AI Runs Here',
  subtitle: 'Applied AI on OpenShift',
  description: 'Tested labs, useful diagrams, and honest notes from the terminal.',
  navigation: [
    { label: 'Articles', href: '/articles/' },
    { label: 'Learning paths', href: '/learning-paths/' },
    { label: 'About', href: '/about/' }
  ]
} as const;

export const topicConfig: Record<Topic, { label: string; description: string }> = {
  'openshift-ai': { label: 'OpenShift AI', description: 'Models, serving, and pipelines' },
  'agentic-ai': { label: 'Agentic AI', description: 'Agents and orchestration' },
  mcp: { label: 'MCP', description: 'Servers and gateways' },
  lightspeed: { label: 'Lightspeed', description: 'AI-assisted operations' }
};

export const learningPathConfig = {
  'start-openshift-ai': { label: 'Start with OpenShift AI', description: 'Build a practical foundation.' },
  'agentic-ai': { label: 'Agentic AI', description: 'Move from model calls to agents.' },
  mcp: { label: 'MCP', description: 'Connect tools, servers, and gateways.' }
} as const;

export function getPublicIntegrationConfig(env: Record<string, string | undefined>) {
  return {
    siteUrl: env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
    buttondownUsername: env.PUBLIC_BUTTONDOWN_USERNAME ?? '',
    giscus: {
      repo: env.PUBLIC_GISCUS_REPO ?? '',
      repoId: env.PUBLIC_GISCUS_REPO_ID ?? '',
      category: env.PUBLIC_GISCUS_CATEGORY ?? 'Announcements',
      categoryId: env.PUBLIC_GISCUS_CATEGORY_ID ?? ''
    }
  };
}
