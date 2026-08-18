import { describe, expect, it } from 'vitest';
import { isPublished, sortNewest } from './posts';

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  data: {
    title: id,
    description: `A complete description for ${id}`,
    publishedDate: new Date('2026-01-01'),
    topic: 'mcp-server',
    tags: [],
    difficulty: 'beginner',
    estimatedMinutes: 10,
    testedVersions: ['OpenShift 4.20'],
    prerequisites: [],
    draft: false,
    featured: false,
    ...overrides
  }
}) as never;

describe('post queries', () => {
  it('hides drafts only in production', () => {
    const draft = post('draft', { draft: true });
    expect(isPublished(draft, 'production')).toBe(false);
    expect(isPublished(draft, 'development')).toBe(true);
  });

  it('sorts updated or published dates newest first', () => {
    const older = post('older');
    const newer = post('newer', { updatedDate: new Date('2026-05-01') });
    expect(sortNewest([older, newer]).map((item) => item.id)).toEqual(['newer', 'older']);
  });

});
