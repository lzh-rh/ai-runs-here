import { describe, expect, it } from 'vitest';
import { postSchema } from '../src/content.config';

const validPost = {
  title: 'Connect an MCP server to OpenShift Lightspeed',
  description: 'A tested path from deployment to a verified Lightspeed query.',
  publishedDate: new Date('2026-07-20'),
  topic: 'mcp',
  tags: ['lightspeed', 'gateway'],
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  testedVersions: ['OpenShift Container Platform 4.20'],
  prerequisites: ['Cluster-admin access'],
  draft: false,
  featured: true,
  learningPath: { id: 'mcp', order: 1 }
};

describe('postSchema', () => {
  it('accepts complete tested lab metadata', () => {
    expect(postSchema.safeParse(validPost).success).toBe(true);
  });

  it.each([
    [{ ...validPost, estimatedMinutes: 0 }, 'non-positive duration'],
    [{ ...validPost, difficulty: 'easy' }, 'uncontrolled difficulty'],
    [{ ...validPost, testedVersions: [] }, 'missing tested version']
  ])('rejects %s', (input) => {
    expect(postSchema.safeParse(input).success).toBe(false);
  });
});
