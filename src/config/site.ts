import type { Topic } from '../content.config';

export const siteConfig = {
  title: 'AI Runs Here',
  subtitle: 'Applied AI on OpenShift',
  description: 'Practical notes on OpenShift Lightspeed, agentic systems, and MCP.',
  navigation: [
    { label: 'Articles', href: '/articles/' }
  ]
} as const;

export const topicConfig = {
  'openshift-lightspeed': {
    label: 'OpenShift Lightspeed',
    description: 'AI-assisted help for understanding and operating OpenShift.'
  },
  'agentic-lightspeed': {
    label: 'Agentic Lightspeed',
    description: 'Agentic workflows that connect reasoning, tools, and platform context.'
  },
  'mcp-gateway': {
    label: 'MCP Gateway',
    description: 'Notes about MCP gateways on OpenShift.'
  },
  'mcp-server': {
    label: 'MCP Server',
    description: 'Notes about MCP servers on OpenShift.'
  },
  'mcp-lifecycle-operator': {
    label: 'MCP Lifecycle Operator',
    description: 'Notes about MCP Lifecycle Operator on OpenShift.'
  }
} satisfies Record<Topic, { label: string; description: string }>;

export function withBase(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}
