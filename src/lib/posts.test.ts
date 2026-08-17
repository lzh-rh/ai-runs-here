import { describe, expect, it } from 'vitest';
import { getRelatedPosts, isPublished, sortNewest } from './posts';

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  data: {
    title: id,
    description: `A complete description for ${id}`,
    publishedDate: new Date('2026-01-01'),
    topic: 'mcp',
    mcpLabels: [],
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

  it('returns newest posts with the current post topic', () => {
    const current = post('current', { topic: 'mcp' });
    const olderMatch = post('older-match', { topic: 'mcp', publishedDate: new Date('2026-02-01') });
    const newestMatch = post('newest-match', { topic: 'mcp', publishedDate: new Date('2026-03-01') });
    const otherTopic = post('other-topic', { topic: 'agentic-lightspeed', publishedDate: new Date('2026-04-01') });

    expect(getRelatedPosts([current, olderMatch, otherTopic, newestMatch], 'current')).toEqual([newestMatch, olderMatch]);
  });

  it('limits related posts and returns none for an unknown current post', () => {
    const current = post('current', { topic: 'mcp' });
    const first = post('first', { topic: 'mcp', publishedDate: new Date('2026-02-01') });
    const second = post('second', { topic: 'mcp', publishedDate: new Date('2026-03-01') });

    expect(getRelatedPosts([current, first, second], 'current', 1)).toEqual([second]);
    expect(getRelatedPosts([current, first, second], 'missing')).toEqual([]);
  });
});
