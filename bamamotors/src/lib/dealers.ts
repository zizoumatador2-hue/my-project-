import { all, first } from './db';

export interface DealerRow {
  id: number;
  owner_user_id: number;
  slug: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city_id: number | null;
  city_name: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  status: 'pending' | 'active' | 'suspended';
  plan: 'free' | 'basic' | 'pro';
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export interface DealerProfile {
  description: string | null;
  website: string | null;
  hours_json: string | null;
  logo_key: string | null;
  license_number: string | null;
  facebook_url: string | null;
}

export type DealerFull = DealerRow & DealerProfile & { city_slug: string | null };

export const DAYS = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
] as const;

export const getDealerForUser = (db: D1Database, userId: number) =>
  first<DealerRow>(db, 'SELECT * FROM dealers WHERE owner_user_id = ?', [userId]);

export const getDealerFullBySlug = (db: D1Database, slug: string) =>
  first<DealerFull>(
    db,
    `SELECT d.*, p.description, p.website, p.hours_json, p.logo_key, p.license_number, p.facebook_url, c.slug AS city_slug
       FROM dealers d LEFT JOIN dealer_profiles p ON p.dealer_id = d.id LEFT JOIN cities c ON c.id = d.city_id
      WHERE d.slug = ?`,
    [slug],
  );

export const getDealerFullById = (db: D1Database, id: number) =>
  first<DealerFull>(
    db,
    `SELECT d.*, p.description, p.website, p.hours_json, p.logo_key, p.license_number, p.facebook_url, c.slug AS city_slug
       FROM dealers d LEFT JOIN dealer_profiles p ON p.dealer_id = d.id LEFT JOIN cities c ON c.id = d.city_id
      WHERE d.id = ?`,
    [id],
  );

export interface DealerCard {
  id: number;
  slug: string;
  name: string;
  city_name: string;
  phone: string;
  logo_key: string | null;
  plan: string;
  vehicle_count: number;
  rating: number | null;
  review_count: number;
  dist2?: number | null;
}

export const DEALER_CARD_SQL = `SELECT d.id, d.slug, d.name, d.city_name, d.phone, d.plan, p.logo_key,
    (SELECT COUNT(*) FROM vehicles v WHERE v.dealer_id = d.id AND v.status = 'active') AS vehicle_count,
    (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.dealer_id = d.id AND r.status = 'approved') AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.dealer_id = d.id AND r.status = 'approved') AS review_count
  FROM dealers d LEFT JOIN dealer_profiles p ON p.dealer_id = d.id`;

export const getFeaturedDealers = (db: D1Database, limit = 6) =>
  all<DealerCard>(
    db,
    `${DEALER_CARD_SQL} WHERE d.status = 'active'
      ORDER BY d.is_featured DESC, (d.plan = 'pro') DESC, (d.plan = 'basic') DESC, vehicle_count DESC LIMIT ?`,
    [limit],
  );

export function parseHours(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const o = JSON.parse(json);
    return typeof o === 'object' && o ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Counts vehicles that consume a plan slot (active + draft). */
export async function activeVehicleCount(db: D1Database, dealerId: number): Promise<number> {
  const r = await first<{ n: number }>(db, "SELECT COUNT(*) AS n FROM vehicles WHERE dealer_id = ? AND status IN ('active','draft')", [dealerId]);
  return r?.n ?? 0;
}

export async function activeFeaturedCount(db: D1Database, dealerId: number, source = 'plan'): Promise<number> {
  const r = await first<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM featured_listings WHERE dealer_id = ? AND status = 'active' AND source = ? AND ends_at > ?",
    [dealerId, source, new Date().toISOString()],
  );
  return r?.n ?? 0;
}
