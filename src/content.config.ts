import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const topics = ['openshift-ai', 'agentic-ai', 'mcp', 'lightspeed'] as const;
export const difficulties = ['beginner', 'intermediate', 'advanced'] as const;

export const postSchema = z.object({
  title: z.string().min(8),
  description: z.string().min(20).max(180),
  publishedDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  topic: z.enum(topics),
  tags: z.array(z.string().min(1)).default([]),
  difficulty: z.enum(difficulties),
  estimatedMinutes: z.number().int().positive(),
  testedVersions: z.array(z.string().min(3)),
  prerequisites: z.array(z.string().min(3)).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  learningPath: z
    .object({
      id: z.enum(['start-openshift-ai', 'agentic-ai', 'mcp']),
      order: z.number().int().positive()
    })
    .optional(),
  image: z.string().optional()
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: postSchema
});

export const collections = { posts };
export type Topic = (typeof topics)[number];
export type Difficulty = (typeof difficulties)[number];
