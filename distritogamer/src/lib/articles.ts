import { getCollection, type CollectionEntry } from 'astro:content';

type Article = CollectionEntry<'articles'>;

export async function allArticles(): Promise<Article[]> {
  const list = await getCollection('articles');
  return list.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export const modified = (a: Article) => a.data.updated ?? a.data.published;

export async function relatedArticles(current: Article, limit = 4): Promise<Article[]> {
  const all = await allArticles();
  const explicit = current.data.related
    .map((id) => all.find((a) => a.id === id))
    .filter((a): a is Article => !!a);
  const scored = all
    .filter((a) => a.id !== current.id && !explicit.includes(a))
    .map((a) => {
      let s = 0;
      if (a.data.category === current.data.category) s += 2;
      if (a.data.game && a.data.game === current.data.game) s += 3;
      s += a.data.tags.filter((t) => current.data.tags.includes(t)).length;
      return { a, s };
    })
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
  return [...explicit, ...scored].slice(0, limit);
}
