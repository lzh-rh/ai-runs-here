import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const topics = [
  'openshift-lightspeed',
  'agentic-lightspeed',
  'mcp-gateway',
  'mcp-server',
  'mcp-lifecycle-operator'
] as const;
export const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
export const contentKinds = ['lab', 'guide'] as const;

const trimmedString = z.string().trim();

const postFields = z.object({
  kind: z.enum(contentKinds),
  title: trimmedString.min(8),
  description: trimmedString.min(20).max(180),
  publishedDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  topic: z.enum(topics),
  tags: z.array(trimmedString.min(1)).default([]),
  difficulty: z.enum(difficulties),
  estimatedMinutes: z.number().int().positive(),
  testedVersions: z.array(trimmedString.min(3)),
  prerequisites: z.array(trimmedString.min(3)).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  image: trimmedString
    .regex(/^\/(?!\/)\S+$/, 'Image must be a root-relative public asset path.')
    .optional()
}).strict();

export const postSchema = postFields.superRefine((post, context) => {
  if (post.kind === 'lab' && !post.draft && post.testedVersions.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['testedVersions'],
      message: 'Published labs require at least one tested version.'
    });
  }

  if (post.updatedDate && post.updatedDate < post.publishedDate) {
    context.addIssue({
      code: 'custom',
      path: ['updatedDate'],
      message: 'Updated date cannot be earlier than published date.'
    });
  }

});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: postSchema
});

export const collections = { posts };
export type Topic = (typeof topics)[number];
export type Difficulty = (typeof difficulties)[number];
export type ContentKind = (typeof contentKinds)[number];
