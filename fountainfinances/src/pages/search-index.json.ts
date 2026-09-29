import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { HUBS } from '@/data/taxonomy';
import { CALCULATORS } from '@/data/calculators';

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides', (g) => !g.data.draft);
  const topics = await getCollection('topics');
  const comparisons = await getCollection('comparisons');
  const products = await getCollection('products', (p) => p.data.active);
  const items = [
    ...guides.map((g) => ({ type: 'guide', title: g.data.title, url: `/guides/${g.id}/`, desc: g.data.description, kw: [...g.data.keywords, ...g.data.faqs.map((f) => f.q)].join(' ') })),
    ...CALCULATORS.map((c) => ({ type: 'calculator', title: c.name, url: `/calculators/${c.slug}/`, desc: c.short, kw: c.keywords.join(' ') })),
    ...comparisons.map((c) => ({ type: 'comparison', title: c.data.title, url: `/best/${c.id}/`, desc: c.data.description, kw: c.data.keywords.join(' ') })),
    ...HUBS.map((h) => ({ type: 'topic', title: h.title, url: `/${h.slug}/`, desc: h.description, kw: h.keywords.join(' ') })),
    ...topics.map((t) => ({ type: 'topic', title: t.data.title, url: `/${t.id}/`, desc: t.data.summary, kw: t.data.keywords.join(' ') })),
    ...products.map((p) => {
      const cmp = comparisons.find((c) => c.data.category === p.data.category);
      return { type: 'product', title: `${p.data.provider} ${p.data.product}`, url: cmp ? `/best/${cmp.id}/#${p.data.id}` : '/best/', desc: `${p.data.type}. ${p.data.bestFor}`, kw: p.data.features.join(' ') };
    }),
  ];
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
