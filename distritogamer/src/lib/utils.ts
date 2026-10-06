import type { CollectionEntry } from 'astro:content';
import { SITE } from '../config/site';

export const abs = (path: string) => `${SITE.url}${path.startsWith('/') ? path : '/' + path}`;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const iso = (d: Date) => d.toISOString().slice(0, 10);

export const articleUrl = (a: CollectionEntry<'articles'>) => `/${a.data.category}/${a.id}/`;

export const wordCount = (s: string) => (s.match(/\b[\w'’-]+\b/g) || []).length;

export const readingMinutes = (body: string | undefined) => Math.max(1, Math.round(wordCount(body || '') / 220));

export const jsonLd = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c');
