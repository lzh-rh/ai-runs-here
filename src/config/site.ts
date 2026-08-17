import type { Topic } from '../content.config';

export const siteConfig = {
  title: 'AI Runs Here',
  subtitle: 'Applied AI on OpenShift',
  description: 'Step-by-step notes on OpenShift Lightspeed, Agentic AI, and MCP.',
  navigation: [
    { label: 'Articles', href: '/articles/' }
  ]
} as const;

export const topicConfig = {
  'openshift-lightspeed': {
    label: 'OpenShift Lightspeed',
    description: 'AI help for learning about OpenShift and solving day-to-day problems.'
  },
  'agentic-lightspeed': {
    label: 'Agentic Lightspeed',
    description: 'AI workflows that use tools and OpenShift data to investigate problems and complete tasks.'
  },
  'mcp-gateway': {
    label: 'MCP Gateway',
    description: 'A Kuadrant-based gateway that connects MCP clients to MCP servers and helps manage those connections.'
  },
  'mcp-server': {
    label: 'MCP Server',
    description: 'A Go-based MCP server that lets AI assistants work with Kubernetes and OpenShift clusters through MCP.'
  },
  'mcp-lifecycle-operator': {
    label: 'MCP Lifecycle Operator',
    description: 'A Kubernetes Operator that deploys and manages MCP servers on OpenShift.'
  }
} satisfies Record<Topic, { label: string; description: string }>;

export function withBase(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}
