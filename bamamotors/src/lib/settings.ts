import { all, run } from './db';

export const SETTING_DEFAULTS: Record<string, string> = {
  site_name: 'BamaMotors',
  tagline: 'Used cars for sale across Alabama, from local dealers',
  contact_email: 'hello@bamamotors.com',
  contact_phone: '',
  default_meta_description:
    'Shop used cars for sale in Alabama from local dealerships. Search by make, price, mileage and city — Birmingham, Huntsville, Mobile, Montgomery and more.',
  default_meta_keywords: 'used cars Alabama, used cars for sale Alabama, car dealerships Alabama, used car dealers Alabama',
  ga4_id: '',
  google_site_verification: '',
  bing_site_verification: '',
  social_facebook: '',
  social_instagram: '',
  social_x: '',
  social_youtube: '',
  dealer_auto_approve: '0',
  featured_price_cents: '2900',
  featured_days: '30',
  announcement: '',
};

let cache: { at: number; data: Record<string, string> } | null = null;

export async function loadSettings(db: D1Database): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const rows = await all<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
  const data = { ...SETTING_DEFAULTS };
  for (const r of rows) data[r.key] = r.value;
  cache = { at: Date.now(), data };
  return data;
}

export async function saveSettings(db: D1Database, values: Record<string, string>): Promise<void> {
  const stmts = Object.entries(values)
    .filter(([k]) => k in SETTING_DEFAULTS)
    .map(([k, v]) =>
      db
        .prepare(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(k, v),
    );
  if (stmts.length) await db.batch(stmts);
  cache = null;
}

export async function clearSettingsCache(): Promise<void> {
  cache = null;
}

export { run };
