/**
 * Planner + search core. Pure TypeScript with no framework imports, so it runs in
 * the browser, at build time and inside the Cloudflare Worker (/api/plan).
 * It only ranks real content from the index — it never invents places, prices or availability.
 */

export type Kind = 'destination' | 'resort' | 'guide' | 'deal';
export type BudgetStyle = 'value' | 'mid-range' | 'splurge';

export interface IndexItem {
  kind: Kind;
  id: string;
  title: string;
  href: string;
  summary: string;
  img: string;
  imgAlt: string;
  destination: string;
  destinationName: string;
  region: string;
  vacationTypes: string[];
  resortTypes: string[];
  idealFor: string[];
  budget: string[];
  months: number[];
  activities: string[];
  adultsOnly: boolean;
  tags: string[];
  rating?: { value: number; source: string };
}

export interface PlanInput {
  budget?: number;
  departureCity?: string;
  destination?: string;
  region?: string;
  travelers?: 'couple' | 'family' | 'friends' | 'solo';
  adults?: number;
  children?: number;
  days?: number;
  vacationType?: string;
  interests?: string[];
  month?: number;
  text?: string;
}

export interface Recommendation {
  item: IndexItem;
  score: number;
  reasons: string[];
}

export interface PlanResult {
  input: PlanInput;
  budgetStyle?: BudgetStyle;
  perPersonPerDay?: number;
  summary: string;
  recommendations: Recommendation[];
  guides: IndexItem[];
  provider: string;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const TYPE_WORDS: [RegExp, string][] = [
  [/honeymoon|newlywed|just married/, 'honeymoon-vacations'],
  [/adults?[- ]only|no kids|child[- ]free|kid[- ]free/, 'adults-only-resorts'],
  [/all[- ]?inclusive/, 'all-inclusive-resorts'],
  [/luxur|splurge|five[- ]star|5[- ]star/, 'luxury-vacations'],
  [/cruise|ship|sail(ing)? (the|to)/, 'cruise-vacations'],
  [/weekend|long weekend|two nights|2 nights/, 'weekend-getaways'],
  [/romantic|romance|anniversary|getaway for two/, 'romantic-getaways'],
  [/beach|ocean|sand|island|snorkel/, 'beach-vacations'],
  [/couple|partner|wife|husband|girlfriend|boyfriend|spouse/, 'couples-vacations'],
];

const INTEREST_WORDS = ['beach', 'snorkel', 'spa', 'wine', 'food', 'hike', 'hiking', 'nightlife', 'shows', 'culture', 'history', 'golf', 'diving', 'sunset', 'adventure', 'nature', 'relax', 'theme park', 'shopping', 'whale', 'volcano', 'art'];

/** Known U.S. departure hubs mapped to a coast, used only as a travel-time heuristic. */
const CITY_COAST: Record<string, 'east' | 'central' | 'west' | 'south'> = {
  'new york': 'east', nyc: 'east', boston: 'east', philadelphia: 'east', washington: 'east', 'washington dc': 'east', dc: 'east', baltimore: 'east',
  atlanta: 'south', charlotte: 'east', miami: 'south', orlando: 'south', tampa: 'south', 'fort lauderdale': 'south', raleigh: 'east', newark: 'east',
  chicago: 'central', dallas: 'central', houston: 'south', austin: 'central', detroit: 'central', minneapolis: 'central', 'st. louis': 'central', nashville: 'south', denver: 'central',
  'los angeles': 'west', la: 'west', 'san francisco': 'west', seattle: 'west', portland: 'west', 'san diego': 'west', phoenix: 'west', 'las vegas': 'west', 'salt lake city': 'west', sacramento: 'west', 'san jose': 'west',
};
const NEAR: Record<string, string[]> = {
  east: ['new-york', 'florida', 'miami', 'orlando', 'bahamas', 'caribbean', 'mexico', 'jamaica', 'dominican-republic'],
  south: ['florida', 'miami', 'orlando', 'bahamas', 'mexico', 'jamaica', 'caribbean', 'dominican-republic'],
  central: ['mexico', 'las-vegas', 'florida', 'orlando', 'jamaica', 'caribbean'],
  west: ['california', 'las-vegas', 'hawaii', 'mexico'],
};
const FAR: Record<string, string[]> = { east: ['hawaii'], south: ['hawaii'], central: [], west: ['caribbean', 'bahamas', 'dominican-republic', 'jamaica'] };
const WEEKEND_FROM: Record<string, string[]> = { east: ['new-york', 'florida', 'miami', 'bahamas'], south: ['florida', 'miami', 'orlando', 'bahamas'], central: ['las-vegas', 'orlando'], west: ['california', 'las-vegas'] };

const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Extract structured hints from a free-text request such as
 *  "I have $2,500 for 5 days. We are a couple departing from New York and want a romantic beach vacation." */
export function parseFreeText(text: string, destinations: { id: string; name: string }[] = []): PlanInput {
  const t = ` ${text.toLowerCase()} `;
  const out: PlanInput = {};
  const money = t.match(/\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?/) || t.match(/(\d{1,3}(?:,\d{3})+|\d{3,6})\s?(?:usd|dollars|bucks)/);
  if (money) {
    let v = parseFloat(money[1].replace(/,/g, ''));
    if (money[2] === 'k') v *= 1000;
    if (v >= 100 && v <= 1_000_000) out.budget = Math.round(v);
  }
  const days = t.match(/(\d{1,2})\s?-?\s?(days?|nights?)/);
  if (days) out.days = clampInt(Number(days[1]) + (days[2].startsWith('night') ? 1 : 0), 1, 30);
  else if (/\b(a|one) week\b/.test(t)) out.days = 7;
  else if (/\btwo weeks\b/.test(t)) out.days = 14;
  else if (/weekend/.test(t)) out.days = 3;

  if (/\b(couple|two of us|my (wife|husband|partner|girlfriend|boyfriend|fianc[ée]e?)|honeymoon|anniversary)\b/.test(t)) out.travelers = 'couple';
  else if (/\b(kids?|children|family|son|daughter)\b/.test(t)) out.travelers = 'family';
  else if (/\bfriends|girls'? trip|guys'? trip\b/.test(t)) out.travelers = 'friends';
  else if (/\b(solo|by myself|alone)\b/.test(t)) out.travelers = 'solo';
  const kids = t.match(/(\d+)\s?(kids|children)/);
  if (kids) out.children = clampInt(Number(kids[1]), 0, 8);

  const from = t.match(/\b(?:from|leaving|departing(?: from)?|flying out of|based in|live in)\s+([a-z .]+?)(?=[,.;!]| and | to | for | with | we | in |$)/);
  if (from) out.departureCity = from[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());

  // Remove the departure phrase so "departing from New York" isn't read as a destination.
  const rest = from ? t.replace(from[0], ' ') : t;
  for (const [re, type] of TYPE_WORDS)
    if (re.test(rest)) {
      out.vacationType = type;
      break;
    }
  out.interests = INTEREST_WORDS.filter((w) => new RegExp(`\\b${w}`).test(rest));
  MONTHS.forEach((m, i) => {
    if (new RegExp(`\\b${m}\\b`).test(rest)) out.month = i + 1;
  });
  for (const d of destinations) if (new RegExp(`\\b${d.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(rest)) out.destination = d.id;
  if (!out.destination && /cancun|tulum|cabo|riviera maya|puerto vallarta|playa del carmen/.test(rest)) out.destination = 'mexico';
  if (!out.destination && /\bnyc\b/.test(rest) && !from) out.destination = 'new-york';
  if (!out.destination && /\b(maui|kauai|oahu|honolulu|waikiki)\b/.test(rest)) out.destination = 'hawaii';
  if (!out.destination && /\b(key west|florida keys|sarasota|palm beach)\b/.test(rest)) out.destination = 'florida';
  if (!out.destination && /\b(st\.? lucia|antigua|aruba|turks|caicos)\b/.test(rest)) out.destination = 'caribbean';
  if (!out.destination && /\b(punta cana|cap cana)\b/.test(rest)) out.destination = 'dominican-republic';
  if (!out.destination && /\b(negril|montego bay|ocho rios)\b/.test(rest)) out.destination = 'jamaica';
  if (!out.destination && /\b(nassau|exuma)\b/.test(rest)) out.destination = 'bahamas';
  if (!out.destination && /\b(napa|big sur|sonoma|carmel)\b/.test(rest)) out.destination = 'california';
  if (!out.destination && /\bvegas\b/.test(rest)) out.destination = 'las-vegas';
  return out;
}

/** Merge explicit form fields over free-text hints (form wins). */
export function mergeInput(form: PlanInput, fromText: PlanInput): PlanInput {
  const out: PlanInput = { ...fromText };
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  if (fromText.interests?.length || form.interests?.length) out.interests = [...new Set([...(form.interests ?? []), ...(fromText.interests ?? [])])];
  return out;
}

export function coastFor(city?: string) {
  if (!city) return undefined;
  const c = city.toLowerCase().replace(/,.*$/, '').trim();
  return CITY_COAST[c];
}

/** Rough budget style from total budget. A heuristic for matching, not a price quote. */
export function budgetStyleFor(budget?: number, people = 2, days = 5): { style?: BudgetStyle; ppd?: number } {
  if (!budget || budget <= 0) return {};
  const ppd = budget / Math.max(1, people) / Math.max(1, days);
  return { style: ppd < 175 ? 'value' : ppd < 400 ? 'mid-range' : 'splurge', ppd: Math.round(ppd) };
}

const STYLE_RANK: Record<string, number> = { value: 0, 'mid-range': 1, splurge: 2 };

export function scoreItem(item: IndexItem, input: PlanInput, style?: BudgetStyle): Recommendation | null {
  const reasons: string[] = [];
  let score = 0;
  const people = (input.adults ?? (input.travelers === 'solo' ? 1 : 2)) + (input.children ?? 0);
  const hasKids = (input.children ?? 0) > 0 || input.travelers === 'family';
  if (hasKids && item.adultsOnly) return null;

  if (input.destination && input.destination !== 'any') {
    if (item.destination === input.destination || item.id === input.destination) {
      score += 6;
      reasons.push(`In ${item.destinationName || item.title}, as you asked`);
    } else score -= 4;
  }
  if (input.region && input.region !== 'any') {
    if (item.region === input.region) score += 2;
    else score -= 2;
  }
  if (input.vacationType) {
    if (item.vacationTypes.includes(input.vacationType)) {
      score += 3;
      reasons.push(`A strong fit for ${input.vacationType.replace(/-/g, ' ')}`);
    } else if (input.vacationType === 'romantic-getaways' && item.idealFor.includes('couples')) score += 1.5;
  }
  const traveler = input.travelers === 'couple' ? 'couples' : input.travelers === 'family' ? 'families' : input.travelers;
  if (traveler && item.idealFor.includes(traveler)) {
    score += 2;
    if (traveler === 'couples' && item.adultsOnly) {
      score += 1;
      reasons.push('Adults-only, so the atmosphere stays calm and romantic');
    } else reasons.push(`Popular with ${traveler}`);
  }
  if (style && item.budget.length) {
    const d = Math.min(...item.budget.map((b) => Math.abs((STYLE_RANK[b] ?? 1) - STYLE_RANK[style])));
    if (d === 0) {
      score += 2;
      reasons.push(`Matches a ${style} budget style for ${people} ${people === 1 ? 'traveler' : 'travelers'}`);
    } else if (d === 2) score -= 2.5;
  }
  if (input.month && item.months.length) {
    if (item.months.includes(input.month)) {
      score += 1.5;
      reasons.push(`${MONTHS[input.month - 1][0].toUpperCase() + MONTHS[input.month - 1].slice(1)} is one of the best months to go`);
    } else score -= 0.5;
  }
  const hay = `${item.activities.join(' ')} ${item.tags.join(' ')} ${item.summary}`.toLowerCase();
  const hits = (input.interests ?? []).filter((i) => hay.includes(i.replace(/ing$/, '')));
  if (hits.length) {
    score += Math.min(3, hits.length);
    reasons.push(`Good for ${hits.slice(0, 3).join(', ')}`);
  }
  const coast = coastFor(input.departureCity);
  const dest = item.destination || item.id;
  if (coast) {
    const short = (input.days ?? 5) <= 3;
    if (short && WEEKEND_FROM[coast]?.includes(dest)) {
      score += 2.5;
      reasons.push(`Quick to reach from ${input.departureCity} for a short trip`);
    } else if (NEAR[coast]?.includes(dest)) {
      score += 1.2;
      reasons.push(`Convenient flights from ${input.departureCity}`);
    }
    if (FAR[coast]?.includes(dest) && (input.days ?? 5) <= 5) score -= 2.5;
  }
  if ((input.days ?? 5) <= 3 && item.vacationTypes.includes('weekend-getaways')) score += 1;
  if (item.kind === 'resort') score += 0.3;
  return { item, score: Math.round(score * 10) / 10, reasons: [...new Set(reasons)].slice(0, 4) };
}

export function plan(items: IndexItem[], rawInput: PlanInput): PlanResult {
  const destinations = items.filter((i) => i.kind === 'destination').map((d) => ({ id: d.id, name: d.title }));
  const input = rawInput.text ? mergeInput(rawInput, parseFreeText(rawInput.text, destinations)) : rawInput;
  const people = (input.adults ?? (input.travelers === 'solo' ? 1 : 2)) + (input.children ?? 0);
  const { style, ppd } = budgetStyleFor(input.budget, people, input.days ?? 5);
  const scored = items
    .filter((i) => i.kind === 'resort' || i.kind === 'destination')
    .map((i) => scoreItem(i, input, style))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

  // Keep variety: at most two picks per destination.
  const perDest = new Map<string, number>();
  const recommendations: Recommendation[] = [];
  for (const r of scored) {
    const k = r.item.destination || r.item.id;
    if ((perDest.get(k) ?? 0) >= 2) continue;
    perDest.set(k, (perDest.get(k) ?? 0) + 1);
    if (!r.reasons.length) r.reasons.push('A well-rounded choice for your trip');
    recommendations.push(r);
    if (recommendations.length === 6) break;
  }
  const topDests = new Set(recommendations.map((r) => r.item.destination || r.item.id));
  const guides = items
    .filter((i) => i.kind === 'guide')
    .map((g) => ({ g, s: (topDests.has(g.destination) ? 2 : 0) + (input.vacationType && g.vacationTypes.includes(input.vacationType) ? 2 : 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.g);

  const parts: string[] = [];
  if (input.travelers) parts.push(input.travelers === 'couple' ? 'a trip for two' : `a ${input.travelers} trip`);
  if (input.days) parts.push(`${input.days} days`);
  if (input.departureCity) parts.push(`from ${input.departureCity}`);
  if (input.budget) parts.push(`about $${input.budget.toLocaleString('en-US')} total`);
  const summary =
    (parts.length ? `Based on ${parts.join(', ')}` : 'Based on your answers') +
    (style ? `, we focused on ${style} options (roughly $${ppd} per person per day before flights, as a rough guide).` : ', here are our best matches.') +
    ' Prices and availability are set by providers, so check live rates before booking.';
  return { input, budgetStyle: style, perPersonPerDay: ppd, summary, recommendations, guides, provider: 'rules' };
}

/** Client-side search filtering used by /search/. */
export interface SearchFilters {
  q?: string;
  kind?: string;
  destination?: string;
  region?: string;
  type?: string;
  resortType?: string;
  budget?: string;
  travelers?: string;
  month?: number;
  children?: number;
  activity?: string;
}

export function searchItems(items: IndexItem[], f: SearchFilters): IndexItem[] {
  const q = f.q?.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter((w) => w.length > 1) : [];
  return items
    .filter((i) => (!f.kind || i.kind === f.kind) && (!f.destination || i.destination === f.destination || i.id === f.destination))
    .filter((i) => (!f.region || i.region === f.region) && (!f.type || i.vacationTypes.includes(f.type)))
    .filter((i) => (!f.resortType || i.resortTypes.includes(f.resortType)) && (!f.budget || !i.budget.length || i.budget.includes(f.budget)))
    .filter((i) => (!f.travelers || i.idealFor.includes(f.travelers)) && (!f.month || !i.months.length || i.months.includes(f.month)))
    .filter((i) => !(f.children && f.children > 0 && i.adultsOnly))
    .filter((i) => !f.activity || `${i.activities.join(' ')} ${i.summary}`.toLowerCase().includes(f.activity.toLowerCase()))
    .map((i) => {
      if (!words.length) return { i, s: 1 };
      const title = i.title.toLowerCase();
      const hay = `${title} ${i.destinationName} ${i.summary} ${i.tags.join(' ')} ${i.activities.join(' ')} ${i.vacationTypes.join(' ')}`.toLowerCase();
      let s = 0;
      for (const w of words) {
        if (title.includes(w)) s += 3;
        else if (hay.includes(w)) s += 1;
      }
      return { i, s: s >= words.length ? s : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.i);
}
