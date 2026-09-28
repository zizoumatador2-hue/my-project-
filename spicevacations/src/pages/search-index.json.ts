import type { APIRoute } from 'astro';
import { lookup, url } from '../lib/content';
import type { IndexItem } from '../lib/planner-core';

/** Static index powering /search/ filters and the /api/plan planner (no server database needed). */
export const GET: APIRoute = async () => {
  const L = await lookup();
  const items: IndexItem[] = [];
  for (const d of L.destinations.values())
    items.push({
      kind: 'destination',
      id: d.id,
      title: d.data.name,
      href: url.destination(d.id),
      summary: d.data.summary,
      img: d.data.image || `/art/${d.data.scene}-${d.data.palette}.svg`,
      imgAlt: d.data.imageAlt,
      destination: d.id,
      destinationName: d.data.name,
      region: d.data.region,
      vacationTypes: d.data.vacationTypes,
      resortTypes: [],
      idealFor: d.data.idealFor,
      budget: d.data.budgetStyles,
      months: d.data.bestMonths,
      activities: d.data.activities,
      adultsOnly: false,
      tags: [d.data.country, d.data.state ?? '', ...d.data.highlights.map((h) => h.title)],
    });
  for (const r of L.resorts.values()) {
    const d = L.destinations.get(r.data.destination);
    items.push({
      kind: 'resort',
      id: r.id,
      title: r.data.name,
      href: url.resort(r.id),
      summary: r.data.summary,
      img: r.data.image || `/art/${r.data.scene}-${r.data.palette}.svg`,
      imgAlt: r.data.imageAlt,
      destination: r.data.destination,
      destinationName: d?.data.name ?? '',
      region: d?.data.region ?? 'usa',
      vacationTypes: r.data.vacationTypes,
      resortTypes: r.data.resortTypes,
      idealFor: r.data.idealFor,
      budget: [r.data.budgetStyle],
      months: d?.data.bestMonths ?? [],
      activities: r.data.features,
      adultsOnly: r.data.adultsOnly,
      tags: [r.data.location],
      rating: r.data.rating ? { value: r.data.rating.value, source: r.data.rating.source } : undefined,
    });
  }
  for (const g of L.guides.values()) {
    const d = L.destinations.get(g.data.destinations[0] ?? '');
    items.push({
      kind: 'guide',
      id: g.id,
      title: g.data.title,
      href: url.guide(g.id),
      summary: g.data.metaDescription,
      img: g.data.image || `/art/${g.data.scene}-${g.data.palette}.svg`,
      imgAlt: g.data.imageAlt,
      destination: d?.id ?? '',
      destinationName: d?.data.name ?? '',
      region: d?.data.region ?? '',
      vacationTypes: [g.data.category],
      resortTypes: [],
      idealFor: ['couples'],
      budget: [],
      months: [],
      activities: [],
      adultsOnly: false,
      tags: [g.data.primaryKeyword, ...g.data.secondaryKeywords],
    });
  }
  for (const de of L.deals.values()) {
    const d = L.destinations.get(de.data.destination);
    items.push({
      kind: 'deal',
      id: de.id,
      title: de.data.title,
      href: url.deal(de.id),
      summary: de.data.summary,
      img: de.data.image || `/art/${de.data.scene}-${de.data.palette}.svg`,
      imgAlt: de.data.imageAlt,
      destination: de.data.destination,
      destinationName: d?.data.name ?? '',
      region: d?.data.region ?? '',
      vacationTypes: [de.data.vacationType],
      resortTypes: [],
      idealFor: ['couples'],
      budget: ['value'],
      months: de.data.months,
      activities: [],
      adultsOnly: false,
      tags: [de.data.window],
    });
  }
  return new Response(JSON.stringify({ generated: new Date().toISOString(), items }), { headers: { 'Content-Type': 'application/json' } });
};
