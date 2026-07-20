import { getCollection } from 'astro:content';
import { validateLearningPathOrders } from './posts';

export async function getPostCollection() {
  return validateLearningPathOrders(await getCollection('posts'));
}
