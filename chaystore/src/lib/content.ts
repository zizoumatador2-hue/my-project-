import { getCollection, type CollectionEntry } from 'astro:content';
import { HUBS, type HubId } from './site';

export type Article = CollectionEntry<'articles'>;

export async function allArticles(): Promise<Article[]> {
  const a = await getCollection('articles');
  return a.sort((x, y) => +y.data.publishDate - +x.data.publishDate || x.data.title.localeCompare(y.data.title));
}
export const hubOf = (a: Article) => HUBS[a.data.hub];
export const url = (a: Article) => `/guides/${a.id}/`;
export const hubUrl = (h: HubId) => `/category/${h}/`;
export const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const words = (s: string) => s.trim().split(/\s+/).length;
export const readMins = (body: string) => Math.max(1, Math.round(words(body) / 220));
