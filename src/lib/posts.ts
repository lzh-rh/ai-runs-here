import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type BuildMode = 'development' | 'production';

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

export function validatePostCollection(posts: Post[]) {
  return posts;
}

export function getRelatedPosts(posts: Post[], currentId: string, limit = 3) {
  const current = posts.find((post) => post.id === currentId);
  if (!current) return [];
  return sortNewest(posts)
    .filter((post) => post.id !== currentId && post.data.topic === current.data.topic)
    .slice(0, limit);
}
