import type { McpLabel, Topic } from '../content.config';

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
