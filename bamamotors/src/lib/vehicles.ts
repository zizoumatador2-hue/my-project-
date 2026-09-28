import { all, first } from './db';
import { CARD_COLUMNS, type VehicleCard } from './search';

export interface VehicleDetail {
  id: number;
  dealer_id: number;
  slug: string;
  vin: string | null;
  stock_number: string | null;
  year: number;
  make_id: number;
  model_id: number;
  make_name: string;
  make_slug: string;
  model_name: string;
  model_slug: string;
  trim: string | null;
  price_cents: number;
  mileage: number;
  body_type: string;
  fuel_type: string;
  transmission: string;
  drivetrain: string;
  exterior_color: string | null;
  interior_color: string | null;
  condition: string;
  engine: string | null;
  mpg_city: number | null;
  mpg_highway: number | null;
  city_id: number | null;
  city_name: string;
  city_slug: string | null;
  zip: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  owners: number | null;
  accident_free: number | null;
  title_status: string | null;
  service_records: number | null;
  history_report_url: string | null;
  status: string;
  featured_until: string | null;
  views: number;
  source: string;
  created_at: string;
  updated_at: string;
  dealer_name: string;
  dealer_slug: string;
  dealer_phone: string;
  dealer_email: string;
  dealer_address: string;
  dealer_city: string;
  dealer_zip: string;
  dealer_status: string;
  dealer_owner_id: number;
}

export interface VehicleImage {
  id: number;
  key_large: string;
  key_small: string;
  width: number | null;
  height: number | null;
  position: number;
}

const DETAIL_SQL = `SELECT v.*, mk.name AS make_name, mk.slug AS make_slug, md.name AS model_name, md.slug AS model_slug,
    c.slug AS city_slug, d.name AS dealer_name, d.slug AS dealer_slug, d.phone AS dealer_phone, d.email AS dealer_email,
    d.address AS dealer_address, d.city_name AS dealer_city, d.zip AS dealer_zip, d.status AS dealer_status,
    d.owner_user_id AS dealer_owner_id
  FROM vehicles v
  JOIN makes mk ON mk.id = v.make_id
  JOIN models md ON md.id = v.model_id
  JOIN dealers d ON d.id = v.dealer_id
  LEFT JOIN cities c ON c.id = v.city_id`;

export const getVehicleBySlug = (db: D1Database, slug: string) =>
  first<VehicleDetail>(db, `${DETAIL_SQL} WHERE v.slug = ?`, [slug]);

export const getVehicleById = (db: D1Database, id: number) => first<VehicleDetail>(db, `${DETAIL_SQL} WHERE v.id = ?`, [id]);

export const getVehicleImages = (db: D1Database, vehicleId: number) =>
  all<VehicleImage>(db, 'SELECT id, key_large, key_small, width, height, position FROM vehicle_images WHERE vehicle_id = ? ORDER BY position, id', [vehicleId]);

export const getVehicleFeatures = async (db: D1Database, vehicleId: number) =>
  (await all<{ feature: string }>(db, 'SELECT feature FROM vehicle_features WHERE vehicle_id = ? ORDER BY feature', [vehicleId])).map((r) => r.feature);

export async function getSimilarVehicles(db: D1Database, v: VehicleDetail, limit = 6): Promise<VehicleCard[]> {
  const lo = Math.round(v.price_cents * 0.7);
  const hi = Math.round(v.price_cents * 1.3);
  return all<VehicleCard>(
    db,
    `SELECT ${CARD_COLUMNS} FROM vehicles v
       JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id JOIN dealers d ON d.id = v.dealer_id
      WHERE v.status = 'active' AND d.status = 'active' AND v.id != ?
        AND (v.model_id = ? OR (v.body_type = ? AND v.price_cents BETWEEN ? AND ?))
      ORDER BY (v.model_id = ?) DESC, ABS(v.price_cents - ?) ASC
      LIMIT ?`,
    [v.id, v.model_id, v.body_type, lo, hi, v.model_id, v.price_cents, limit],
  );
}

export async function getFeaturedVehicles(db: D1Database, limit = 8): Promise<VehicleCard[]> {
  const now = new Date().toISOString();
  return all<VehicleCard>(
    db,
    `SELECT ${CARD_COLUMNS} FROM vehicles v
       JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id JOIN dealers d ON d.id = v.dealer_id
      WHERE v.status = 'active' AND d.status = 'active'
      ORDER BY (COALESCE(v.featured_until,'') > ?) DESC, (image_key IS NOT NULL) DESC, v.created_at DESC
      LIMIT ?`,
    [now, limit],
  );
}

export interface PriceStat {
  label: string;
  count: number;
  min_cents: number;
  avg_cents: number;
  max_cents: number;
  avg_mileage: number;
}

/**
 * Live price statistics computed from active BamaMotors inventory. Used as original,
 * always-current data on landing pages (table snippet) — never invented numbers.
 */
export async function priceStatsByBody(db: D1Database, where = '', params: (string | number)[] = []): Promise<PriceStat[]> {
  return all<PriceStat>(
    db,
    `SELECT v.body_type AS label, COUNT(*) AS count, MIN(v.price_cents) AS min_cents, CAST(AVG(v.price_cents) AS INTEGER) AS avg_cents,
            MAX(v.price_cents) AS max_cents, CAST(AVG(v.mileage) AS INTEGER) AS avg_mileage
       FROM vehicles v JOIN dealers d ON d.id = v.dealer_id JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id
      WHERE v.status = 'active' AND d.status = 'active' ${where}
      GROUP BY v.body_type HAVING COUNT(*) >= 1 ORDER BY count DESC`,
    params,
  );
}

export async function priceStatsByModel(db: D1Database, where = '', params: (string | number)[] = [], limit = 10): Promise<PriceStat[]> {
  return all<PriceStat>(
    db,
    `SELECT mk.name || ' ' || md.name AS label, COUNT(*) AS count, MIN(v.price_cents) AS min_cents,
            CAST(AVG(v.price_cents) AS INTEGER) AS avg_cents, MAX(v.price_cents) AS max_cents, CAST(AVG(v.mileage) AS INTEGER) AS avg_mileage
       FROM vehicles v JOIN dealers d ON d.id = v.dealer_id JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id
      WHERE v.status = 'active' AND d.status = 'active' ${where}
      GROUP BY v.model_id ORDER BY count DESC, label LIMIT ?`,
    [...params, limit],
  );
}

export function mediaUrl(key: string | null | undefined): string | null {
  return key ? `/media/${key}` : null;
}
