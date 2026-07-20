import { describe, expect, it } from 'vitest';
import { postSchema } from '../src/content.config';

const validLab = {
  kind: 'lab',
  title: 'A representative tested lab article',
  description: 'A test fixture with complete lab metadata for schema validation.',
  publishedDate: new Date('2026-07-20'),
  topic: 'mcp',
  tags: ['lightspeed', 'gateway'],
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  testedVersions: ['Example product 1.0.0'],
  prerequisites: ['Cluster-admin access'],
  draft: false,
  featured: true,
  learningPath: { id: 'mcp', order: 1 }
};

describe('postSchema', () => {
  it('accepts a published lab with tested-version evidence', () => {
    expect(postSchema.safeParse(validLab).success).toBe(true);
  });

  it('accepts a published guide without fabricated tested versions', () => {
    expect(postSchema.safeParse({ ...validLab, kind: 'guide', testedVersions: [] }).success).toBe(true);
  });

  it('accepts a draft lab before tested-version evidence exists', () => {
    expect(postSchema.safeParse({ ...validLab, draft: true, testedVersions: [] }).success).toBe(true);
  });

  it('rejects a published lab without tested-version evidence', () => {
    const result = postSchema.safeParse({ ...validLab, testedVersions: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['testedVersions'],
            message: 'Published labs require at least one tested version.'
          })
        ])
      );
    }
  });

  it.each([
    [{ ...validLab, kind: 'reference' }, 'uncontrolled content kind'],
    [{ ...validLab, estimatedMinutes: 0 }, 'non-positive duration'],
    [{ ...validLab, difficulty: 'easy' }, 'uncontrolled difficulty'],
    [{ ...validLab, testedVersions: [''] }, 'blank tested version']
  ])('rejects %s', (input) => {
    expect(postSchema.safeParse(input).success).toBe(false);
  });
});
