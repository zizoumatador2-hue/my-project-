import { describe, expect, it } from 'vitest';
import { budgetStyleFor, parseFreeText, plan, searchItems, type IndexItem } from '../src/lib/planner-core';

const base = { summary: 'x', img: '/a.svg', imgAlt: 'alt text', resortTypes: [], activities: ['Beach days'], tags: [], adultsOnly: false };
const items: IndexItem[] = [
  { ...base, kind: 'destination', id: 'florida', title: 'Florida', href: '/destinations/florida/', destination: 'florida', destinationName: 'Florida', region: 'usa', vacationTypes: ['romantic-getaways', 'beach-vacations', 'weekend-getaways'], idealFor: ['couples'], budget: ['value', 'mid-range'], months: [3, 4, 5] },
  { ...base, kind: 'destination', id: 'hawaii', title: 'Hawaii', href: '/destinations/hawaii/', destination: 'hawaii', destinationName: 'Hawaii', region: 'usa', vacationTypes: ['honeymoon-vacations', 'beach-vacations'], idealFor: ['couples'], budget: ['splurge'], months: [4, 5, 9] },
  { ...base, kind: 'resort', id: 'kid-free', title: 'Adults Resort', href: '/resorts/kid-free/', destination: 'mexico', destinationName: 'Mexico', region: 'mexico', vacationTypes: ['adults-only-resorts'], resortTypes: ['adults-only'], idealFor: ['couples'], budget: ['mid-range'], months: [1, 2], adultsOnly: true },
  { ...base, kind: 'guide', id: 'g', title: 'Florida guide', href: '/guides/g/', destination: 'florida', destinationName: 'Florida', region: 'usa', vacationTypes: ['romantic-getaways'], idealFor: ['couples'], budget: [], months: [] },
];

describe('free-text parsing', () => {
  it('reads budget, days, travelers, departure city and style', () => {
    const p = parseFreeText('I have $2,500 for 5 days. We are a couple departing from New York and want a romantic beach vacation.');
    expect(p.budget).toBe(2500);
    expect(p.days).toBe(5);
    expect(p.travelers).toBe('couple');
    expect(p.departureCity).toBe('New York');
    expect(p.vacationType).toBe('romantic-getaways');
    expect(p.interests).toContain('beach');
  });
  it('understands "2.5k", nights and destination names', () => {
    const p = parseFreeText('about $2.5k, 4 nights in Maui', [{ id: 'hawaii', name: 'Hawaii' }]);
    expect(p.budget).toBe(2500);
    expect(p.days).toBe(5);
    expect(p.destination).toBe('hawaii');
  });
});

describe('planner', () => {
  it('derives a budget style heuristic', () => {
    expect(budgetStyleFor(2500, 2, 5).style).toBe('mid-range');
    expect(budgetStyleFor(800, 2, 4).style).toBe('value');
    expect(budgetStyleFor(10000, 2, 5).style).toBe('splurge');
  });
  it('ranks only real items and explains why', () => {
    const r = plan(items, { text: 'Couple from New York, $1,500 for a 3 day romantic weekend' });
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.recommendations[0].item.id).toBe('florida');
    expect(r.recommendations[0].reasons.length).toBeGreaterThan(0);
    expect(r.summary).toMatch(/Prices and availability are set by providers/);
  });
  it('never recommends adults-only resorts to families with children', () => {
    const r = plan(items, { travelers: 'family', children: 2, vacationType: 'adults-only-resorts' });
    expect(r.recommendations.some((x) => x.item.adultsOnly)).toBe(false);
  });
});

describe('search', () => {
  it('filters by type, region and keyword', () => {
    expect(searchItems(items, { type: 'honeymoon-vacations' }).map((i) => i.id)).toEqual(['hawaii']);
    expect(searchItems(items, { region: 'mexico' }).map((i) => i.id)).toEqual(['kid-free']);
    expect(searchItems(items, { q: 'florida' }).map((i) => i.id)).toContain('florida');
    expect(searchItems(items, { children: 1, kind: 'resort' })).toHaveLength(0);
  });
});

describe('free-text edge cases', () => {
  it('does not treat the departure city as the destination, nor match words inside words', () => {
    const p = parseFreeText('We are departing from New York and want a beach trip', [{ id: 'new-york', name: 'New York' }]);
    expect(p.destination).toBeUndefined();
    expect(p.interests).not.toContain('art');
    expect(p.interests).toContain('beach');
  });
});
