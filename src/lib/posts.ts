import type { CollectionEntry } from 'astro:content';
import type { learningPathConfig } from '../config/site';

export type Post = CollectionEntry<'posts'>;
export type BuildMode = 'development' | 'production';
type LearningPathId = keyof typeof learningPathConfig;

const effectiveDate = (post: Post) => post.data.updatedDate ?? post.data.publishedDate;

export function isPublished(post: Post, mode: BuildMode) {
  return mode === 'development' || !post.data.draft;
}

export function sortNewest(posts: Post[]) {
  return [...posts].sort((a, b) => effectiveDate(b).getTime() - effectiveDate(a).getTime());
}

export function getFeaturedPost(posts: Post[]) {
  const sortedPosts = sortNewest(posts);
  return sortedPosts.find((post) => post.data.featured) ?? sortedPosts[0];
}

export function getLearningPathGroups(posts: Post[]) {
  return posts.filter((post) => post.data.learningPath).reduce((groups, post) => {
    const id = post.data.learningPath!.id as LearningPathId;
    groups.set(id, [...(groups.get(id) ?? []), post]);
    return groups;
  }, new Map<LearningPathId, Post[]>());
}

export function getPathNeighbors(posts: Post[], currentId: string) {
  const current = posts.find((post) => post.id === currentId);
  if (!current?.data.learningPath) return { previous: undefined, next: undefined };

  const ordered = posts
    .filter((post) => post.data.learningPath?.id === current.data.learningPath?.id)
    .sort((a, b) => a.data.learningPath!.order - b.data.learningPath!.order);
  const index = ordered.findIndex((post) => post.id === currentId);

  return { previous: ordered[index - 1], next: ordered[index + 1] };
}
