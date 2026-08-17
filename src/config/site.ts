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
    description: 'A Kuadrant-based application gateway that handles connectivity and management of MCP servers for MCP clients.'
  },
  'mcp-server': {
    label: 'MCP Server',
    description: 'A native Go MCP server that bridges AI assistants to Kubernetes and OpenShift clusters through the Model Context Protocol.'
  },
  'mcp-lifecycle-operator': {
    label: 'MCP Lifecycle Operator',
    description: 'A Kubernetes-native operator that manages the deployment and lifecycle of MCP servers on OpenShift.'
  }
} satisfies Record<Topic, { label: string; description: string }>;

export function withBase(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}
