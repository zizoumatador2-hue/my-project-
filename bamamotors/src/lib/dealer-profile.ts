import { z } from 'zod';
import { run, nowIso, audit } from './db';
import { phoneSchema, urlSchema, zipSchema, emailSchema, zodErrors, type FieldErrors } from './validation';
import { DAYS } from './dealers';
import { locateDealer } from './accounts';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the dealership name').max(120),
  phone: phoneSchema.refine((v) => v !== '', 'Enter a phone number'),
  email: emailSchema,
  address: z.string().trim().min(5, 'Enter the street address').max(200),
  city_name: z.string().trim().min(2, 'Enter the city').max(80),
  zip: zipSchema,
  description: z.string().trim().max(5000).optional().default(''),
  website: urlSchema.optional().default(''),
  facebook_url: urlSchema.optional().default(''),
  license_number: z.string().trim().max(40).optional().default(''),
});

/** Updates dealer core + profile fields (used by dealers and admins). Slug is kept stable for SEO. */
export async function saveDealerProfile(db: D1Database, dealerId: number, input: Record<string, string>, actorId: number): Promise<FieldErrors | null> {
  const p = schema.safeParse(input);
  if (!p.success) return zodErrors(p.error);
  const d = p.data;
  const hours: Record<string, string> = {};
  for (const [k] of DAYS) {
    const val = String(input[`hours_${k}`] ?? '').trim().slice(0, 40);
    if (val) hours[k] = val;
  }
  const loc = await locateDealer(db, d.city_name, d.zip);
  await db.batch([
    db.prepare('UPDATE dealers SET name = ?, phone = ?, email = ?, address = ?, city_name = ?, zip = ?, city_id = ?, lat = ?, lng = ?, updated_at = ? WHERE id = ?')
      .bind(d.name, d.phone, d.email, d.address, d.city_name, d.zip, loc.cityId, loc.lat, loc.lng, nowIso(), dealerId),
    db.prepare(`INSERT INTO dealer_profiles (dealer_id, description, website, hours_json, license_number, facebook_url, updated_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(dealer_id) DO UPDATE SET description = excluded.description, website = excluded.website, hours_json = excluded.hours_json,
        license_number = excluded.license_number, facebook_url = excluded.facebook_url, updated_at = excluded.updated_at`)
      .bind(dealerId, d.description || null, d.website || null, JSON.stringify(hours), d.license_number || null, d.facebook_url || null, nowIso()),
    // Keep vehicle locations in sync with the dealership.
    db.prepare('UPDATE vehicles SET city_id = ?, city_name = ?, zip = ?, lat = ?, lng = ? WHERE dealer_id = ?').bind(loc.cityId, d.city_name, d.zip, loc.lat, loc.lng, dealerId),
  ]);
  await audit(db, actorId, 'dealer.profile', 'dealer', dealerId);
  return null;
}
export { run };
