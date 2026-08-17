import { getCollection } from 'astro:content';
import { validatePostCollection } from './posts';

export async function getPostCollection() {
  return validatePostCollection(await getCollection('posts'));
}
