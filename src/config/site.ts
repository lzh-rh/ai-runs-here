import type { McpLabel, Topic } from '../content.config';

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
  mcp: {
    label: 'MCP',
    description: 'Model Context Protocol servers, gateways, and lifecycle operations.'
  }
} satisfies Record<Topic, { label: string; description: string }>;

export const mcpLabelConfig: Record<McpLabel, string> = {
  'mcp-gateway': 'MCP Gateway',
  'mcp-server': 'MCP Server',
  'mcp-lifecycle-operator': 'MCP Lifecycle Operator'
};

export const mcpTopicDescriptionConfig: Record<McpLabel, string> = {
  'mcp-gateway': 'Notes about MCP gateways on OpenShift.',
  'mcp-server': 'Notes about MCP servers on OpenShift.',
  'mcp-lifecycle-operator': 'Notes about MCP Lifecycle Operator on OpenShift.'
};

export function withBase(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, '/');
}
