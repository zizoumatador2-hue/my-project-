import { getCollection } from 'astro:content';
import { categoryBySlug } from '../data/categories';
import { articleUrl } from '../lib/utils';

export async function GET() {
  const articles = await getCollection('articles');
  const games = await getCollection('games');
  const docs = [
    ...articles.map((a) => ({
      t: a.data.title, d: a.data.description, u: articleUrl(a), c: categoryBySlug(a.data.category).name, k: 'Guide',
      w: [...a.data.tags, ...a.data.keywords].join(' '),
    })),
    ...games.map((g) => ({
      t: `${g.data.name} guides and settings`, d: g.data.summary, u: `/games/${g.id}/`, c: 'Game', k: 'Game',
      w: `${g.data.name} ${g.data.genre} ${g.data.developer} ${g.data.platforms.join(' ')}`,
    })),
  ];
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
}
