import { describe, expect, it } from 'vitest';
import { postSchema } from '../src/content.config';

const validLab = {
  kind: 'lab',
  title: 'A representative tested lab article',
  description: 'A test fixture with complete lab metadata for schema validation.',
  publishedDate: new Date('2026-07-20'),
  topic: 'mcp-gateway',
  tags: ['lightspeed', 'gateway'],
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  testedVersions: ['Example product 1.0.0'],
  prerequisites: ['Cluster-admin access'],
  draft: false,
  featured: true
};

const base = {
  kind: 'guide',
  title: 'Understand OpenShift Lightspeed behavior',
  description: 'A sufficiently complete description for a focused technical field note.',
  publishedDate: new Date('2026-08-17'),
  topic: 'openshift-lightspeed',
  tags: [],
  difficulty: 'beginner',
  estimatedMinutes: 5,
  testedVersions: [],
  prerequisites: [],
  draft: false,
  featured: false
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
    ['title', { title: '        ' }],
    ['description', { description: '                    ' }],
    ['testedVersions', { testedVersions: ['   '] }]
  ])('rejects whitespace-only published lab %s', (_field, override) => {
    expect(postSchema.safeParse({ ...validLab, ...override }).success).toBe(false);
  });

  it('trims author-provided strings before applying content constraints', () => {
    const result = postSchema.safeParse({
      ...validLab,
      title: `  ${validLab.title}  `,
      description: `  ${validLab.description}  `,
      tags: ['  lightspeed  '],
      testedVersions: ['  Example product 1.0.0  '],
      prerequisites: ['  Cluster-admin access  '],
      image: '  /images/example-social.svg  '
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        title: validLab.title,
        description: validLab.description,
        tags: ['lightspeed'],
        testedVersions: ['Example product 1.0.0'],
        prerequisites: ['Cluster-admin access'],
        image: '/images/example-social.svg'
      });
    }
  });

  it.each([
    'javascript:alert(1)',
    'https://example.com/social.svg',
    '//cdn.example.com/social.svg',
    'images/social.svg'
  ])('rejects a non-root-relative social image path: %s', (image) => {
    expect(postSchema.safeParse({ ...validLab, image }).success).toBe(false);
  });

  it('rejects an updated date earlier than the published date', () => {
    const result = postSchema.safeParse({
      ...validLab,
      publishedDate: new Date('2026-07-20'),
      updatedDate: new Date('2026-07-19')
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['updatedDate'],
            message: 'Updated date cannot be earlier than published date.'
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

describe('minimal topic schema', () => {
  it.each([
    'openshift-lightspeed',
    'agentic-lightspeed',
    'mcp-gateway',
    'mcp-server',
    'mcp-lifecycle-operator'
  ])('accepts topic %s', (topic) => {
    expect(postSchema.safeParse({ ...base, topic }).success).toBe(true);
  });

  it.each(['openshift-ai', 'agentic-ai', 'lightspeed', 'mcp'])('rejects removed topic %s', (topic) => {
    expect(postSchema.safeParse({ ...base, topic }).success).toBe(false);
  });

  it('does not accept the removed mcpLabels field', () => {
    expect(postSchema.safeParse({ ...base, mcpLabels: ['mcp-server'] }).success).toBe(false);
  });

  it('does not accept the removed learningPath field', () => {
    expect(postSchema.safeParse({ ...base, learningPath: { id: 'mcp', order: 1 } }).success).toBe(false);
  });
});
