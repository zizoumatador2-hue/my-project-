import { BODY_TYPES, CONDITIONS, DRIVETRAINS, FUEL_TYPES, PAGE_SIZE, RADII, SORTS, TRANSMISSIONS, COLORS } from './constants';
import type { Params } from './db';

export interface SearchFilters {
  q?: string;
  make?: string; // make slug
  model?: string; // model slug
  minPrice?: number; // dollars
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  body?: string; // body type value (e.g. "SUV")
  fuel?: string;
  transmission?: string;
  drivetrain?: string;
  extColor?: string;
  intColor?: string;
  condition?: string;
  city?: string; // city slug
  zip?: string;
  radius?: number; // miles
  dealerId?: number;
  sort: string;
  page: number;
}

export interface Origin {
  lat: number;
  lng: number;
  label: string;
}

const int = (v: string | null, min: number, max: number): number | undefined => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v.replace(/[,$\s]/g, ''));
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const oneOf = (v: string | null, allowed: readonly string[]): string | undefined => {
  if (!v) return undefined;
  const hit = allowed.find((a) => a.toLowerCase() === v.toLowerCase());
  return hit;
};
const slugParam = (v: string | null): string | undefined => (v && /^[a-z0-9-]{1,80}$/.test(v) ? v : undefined);

/** Parses and whitelists query-string filters. Unknown/invalid values are dropped, never passed to SQL. */
export function parseFilters(sp: URLSearchParams): SearchFilters {
  const zip = sp.get('zip')?.trim();
  const radius = int(sp.get('radius'), 1, 500);
  const q = sp.get('q')?.replace(/[^\p{L}\p{N}\s\-.]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return {
    q: q || undefined,
    make: slugParam(sp.get('make')),
    model: slugParam(sp.get('model')),
    minPrice: int(sp.get('min_price'), 0, 1_000_000),
    maxPrice: int(sp.get('max_price'), 0, 1_000_000),
    minYear: int(sp.get('min_year'), 1950, 2100),
    maxYear: int(sp.get('max_year'), 1950, 2100),
    maxMileage: int(sp.get('max_mileage'), 0, 1_000_000),
    body: oneOf(sp.get('body'), BODY_TYPES.map((b) => b.value)),
    fuel: oneOf(sp.get('fuel'), FUEL_TYPES),
    transmission: oneOf(sp.get('transmission'), TRANSMISSIONS),
    drivetrain: oneOf(sp.get('drivetrain'), DRIVETRAINS),
    extColor: oneOf(sp.get('ext_color'), COLORS),
    intColor: oneOf(sp.get('int_color'), COLORS),
    condition: oneOf(sp.get('condition'), CONDITIONS.map((c) => c.value)),
    city: slugParam(sp.get('city')),
    zip: zip && /^\d{5}$/.test(zip) ? zip : undefined,
    radius: radius && (RADII as readonly number[]).includes(radius) ? radius : radius ? 50 : undefined,
    sort: oneOf(sp.get('sort'), SORTS.map((s) => s.value)) ?? 'recommended',
    page: int(sp.get('page'), 1, 500) ?? 1,
  };
}

/** Serializes filters back to a query string (used for pagination / sort links). */
export function filtersToQuery(f: Partial<SearchFilters>, overrides: Record<string, string | number | undefined> = {}): string {
  const map: Record<string, string | number | undefined> = {
    q: f.q, make: f.make, model: f.model, min_price: f.minPrice, max_price: f.maxPrice, min_year: f.minYear,
    max_year: f.maxYear, max_mileage: f.maxMileage, body: f.body, fuel: f.fuel, transmission: f.transmission,
    drivetrain: f.drivetrain, ext_color: f.extColor, int_color: f.intColor, condition: f.condition, city: f.city,
    zip: f.zip, radius: f.radius, sort: f.sort && f.sort !== 'recommended' ? f.sort : undefined,
    page: f.page && f.page > 1 ? f.page : undefined,
    ...overrides,
  };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(map)) if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function countActiveFilters(f: SearchFilters): number {
  const keys: (keyof SearchFilters)[] = [
    'q', 'make', 'model', 'minPrice', 'maxPrice', 'minYear', 'maxYear', 'maxMileage', 'body', 'fuel',
    'transmission', 'drivetrain', 'extColor', 'intColor', 'condition', 'city', 'zip',
  ];
  return keys.filter((k) => f[k] !== undefined).length;
}

export const CARD_COLUMNS = `
  v.id, v.slug, v.year, v.trim, v.price_cents, v.mileage, v.city_name, v.body_type, v.fuel_type, v.transmission,
  v.drivetrain, v.condition, v.featured_until, v.status, v.created_at,
  mk.name AS make_name, mk.slug AS make_slug, md.name AS model_name, md.slug AS model_slug,
  d.name AS dealer_name, d.slug AS dealer_slug,
  (SELECT key_small FROM vehicle_images vi WHERE vi.vehicle_id = v.id ORDER BY vi.position, vi.id LIMIT 1) AS image_key`;

export interface BuiltQuery {
  countSql: string;
  listSql: string;
  params: Params;
  listParams: Params;
}

/**
 * Builds parameterized SQL for a vehicle search. `origin` is the resolved centre for
 * city/ZIP radius searches. Distance uses an equirectangular approximation (accurate to
 * well under 1% at Alabama's latitudes) so it runs on plain SQLite arithmetic.
 */
export function buildSearchQuery(f: SearchFilters, origin: Origin | null, nowIsoStr: string, pageSize = PAGE_SIZE): BuiltQuery {
  const where: string[] = ["v.status = 'active'", "d.status = 'active'"];
  const params: Params = [];

  if (f.make) { where.push('mk.slug = ?'); params.push(f.make); }
  if (f.model) { where.push('md.slug = ?'); params.push(f.model); }
  if (f.minPrice !== undefined) { where.push('v.price_cents >= ?'); params.push(f.minPrice * 100); }
  if (f.maxPrice !== undefined) { where.push('v.price_cents <= ?'); params.push(f.maxPrice * 100); }
  if (f.minYear !== undefined) { where.push('v.year >= ?'); params.push(f.minYear); }
  if (f.maxYear !== undefined) { where.push('v.year <= ?'); params.push(f.maxYear); }
  if (f.maxMileage !== undefined) { where.push('v.mileage <= ?'); params.push(f.maxMileage); }
  if (f.body) { where.push('v.body_type = ?'); params.push(f.body); }
  if (f.fuel) { where.push('v.fuel_type = ?'); params.push(f.fuel); }
  if (f.transmission) { where.push('v.transmission = ?'); params.push(f.transmission); }
  if (f.drivetrain) { where.push('v.drivetrain = ?'); params.push(f.drivetrain); }
  if (f.extColor) { where.push('v.exterior_color = ?'); params.push(f.extColor); }
  if (f.intColor) { where.push('v.interior_color = ?'); params.push(f.intColor); }
  if (f.condition) { where.push('v.condition = ?'); params.push(f.condition); }
  if (f.dealerId) { where.push('v.dealer_id = ?'); params.push(f.dealerId); }
  if (f.q) {
    for (const term of f.q.split(/\s+/).filter(Boolean).slice(0, 5)) {
      where.push("(mk.name LIKE ? ESCAPE '\\' OR md.name LIKE ? ESCAPE '\\' OR v.trim LIKE ? ESCAPE '\\' OR CAST(v.year AS TEXT) = ?)");
      const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      params.push(like, like, like, term);
    }
  }

  let distExpr = 'NULL';
  const distParams: Params = [];
  if (origin) {
    const kx = 69.0 * Math.cos((origin.lat * Math.PI) / 180);
    // ((lat-lat0)*69)^2 + ((lng-lng0)*kx)^2
    distExpr = '(((v.lat - ?) * 69.0) * ((v.lat - ?) * 69.0) + ((v.lng - ?) * ?) * ((v.lng - ?) * ?))';
    distParams.push(origin.lat, origin.lat, origin.lng, kx, origin.lng, kx);
    const radius = f.radius ?? 50;
    where.push('v.lat IS NOT NULL');
    // Cheap bounding box first (uses idx_vehicles_geo), then the exact circle.
    const dLat = radius / 69.0;
    const dLng = radius / kx;
    where.push('v.lat BETWEEN ? AND ?', 'v.lng BETWEEN ? AND ?');
    params.push(origin.lat - dLat, origin.lat + dLat, origin.lng - dLng, origin.lng + dLng);
    where.push(`${distExpr} <= ?`);
    params.push(...distParams, radius * radius);
  }

  const from = `FROM vehicles v
    JOIN makes mk ON mk.id = v.make_id
    JOIN models md ON md.id = v.model_id
    JOIN dealers d ON d.id = v.dealer_id
    WHERE ${where.join(' AND ')}`;

  let order: string;
  const orderParams: Params = [];
  switch (f.sort) {
    case 'newest': order = 'v.created_at DESC, v.id DESC'; break;
    case 'price_asc': order = 'v.price_cents ASC, v.id DESC'; break;
    case 'price_desc': order = 'v.price_cents DESC, v.id DESC'; break;
    case 'mileage_asc': order = 'v.mileage ASC, v.id DESC'; break;
    case 'year_desc': order = 'v.year DESC, v.mileage ASC, v.id DESC'; break;
    case 'distance':
      if (origin) { order = `${distExpr} ASC, v.id DESC`; orderParams.push(...distParams); break; }
    // falls through when there is no origin
    default:
      order = "(COALESCE(v.featured_until, '') > ?) DESC, (image_key IS NOT NULL) DESC, v.created_at DESC, v.id DESC";
      orderParams.push(nowIsoStr);
  }

  const offset = (Math.max(1, f.page) - 1) * pageSize;
  const selectDist = origin ? `, ${distExpr} AS dist2` : ', NULL AS dist2';
  return {
    countSql: `SELECT COUNT(*) AS n ${from}`,
    listSql: `SELECT ${CARD_COLUMNS}${selectDist} ${from} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${offset}`,
    params,
    listParams: [...(origin ? distParams : []), ...params, ...orderParams],
  };
}

export interface VehicleCard {
  id: number;
  slug: string;
  year: number;
  trim: string | null;
  price_cents: number;
  mileage: number;
  city_name: string;
  body_type: string;
  fuel_type: string;
  transmission: string;
  drivetrain: string;
  condition: string;
  featured_until: string | null;
  status: string;
  created_at: string;
  make_name: string;
  make_slug: string;
  model_name: string;
  model_slug: string;
  dealer_name: string;
  dealer_slug: string;
  image_key: string | null;
  dist2?: number | null;
}

export async function resolveOrigin(db: D1Database, f: SearchFilters): Promise<Origin | null> {
  if (f.zip) {
    const z = await db.prepare('SELECT zip, city, lat, lng FROM zip_codes WHERE zip = ?').bind(f.zip).first<{ zip: string; city: string; lat: number; lng: number }>();
    if (z) return { lat: z.lat, lng: z.lng, label: `${z.city}, AL ${z.zip}` };
  }
  if (f.city) {
    const c = await db.prepare('SELECT name, lat, lng FROM cities WHERE slug = ?').bind(f.city).first<{ name: string; lat: number; lng: number }>();
    if (c) return { lat: c.lat, lng: c.lng, label: `${c.name}, AL` };
  }
  return null;
}

export async function runSearch(
  db: D1Database,
  f: SearchFilters,
  pageSize = PAGE_SIZE,
): Promise<{ total: number; items: VehicleCard[]; origin: Origin | null; pages: number }> {
  const origin = await resolveOrigin(db, f);
  const effective = origin && f.radius === undefined ? { ...f, radius: f.zip ? 50 : 30 } : f;
  const q = buildSearchQuery(effective, origin, new Date().toISOString(), pageSize);
  const [count, list] = await db.batch([
    db.prepare(q.countSql).bind(...q.params),
    db.prepare(q.listSql).bind(...q.listParams),
  ]);
  const total = Number((count.results?.[0] as { n: number } | undefined)?.n ?? 0);
  return { total, items: (list.results ?? []) as VehicleCard[], origin, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
