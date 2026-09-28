import { first, insert, run, nowIso, audit } from './db';
import { vehicleSchema, zodErrors, type FieldErrors } from './validation';
import { vehicleSlugBase, uniqueSlug } from './slug';
import { planOf } from './plans';
import { activeVehicleCount } from './dealers';
import { BODY_TYPES, FUEL_TYPES, TRANSMISSIONS, DRIVETRAINS, COLORS } from './constants';
import { deleteImages } from './uploads';

export type SaveResult = { ok: true; id: number } | { ok: false; errors: FieldErrors };

/**
 * Creates or updates a vehicle for a dealer. Location is inherited from the dealership.
 * `enforceLimit` applies the dealer's plan inventory limit (admins bypass it).
 */
export async function saveVehicle(
  db: D1Database,
  input: Record<string, string>,
  opts: { dealerId: number; vehicleId?: number; actorId: number; enforceLimit: boolean; source: 'dealer' | 'admin' },
): Promise<SaveResult> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };
  const v = parsed.data;
  const errors: FieldErrors = {};
  if (!BODY_TYPES.some((b) => b.value === v.body_type)) errors.body_type = 'Choose a body type';
  if (!(FUEL_TYPES as readonly string[]).includes(v.fuel_type)) errors.fuel_type = 'Choose a fuel type';
  if (!(TRANSMISSIONS as readonly string[]).includes(v.transmission)) errors.transmission = 'Choose a transmission';
  if (!(DRIVETRAINS as readonly string[]).includes(v.drivetrain)) errors.drivetrain = 'Choose a drivetrain';
  if (v.exterior_color && !(COLORS as readonly string[]).includes(v.exterior_color)) errors.exterior_color = 'Choose a color';
  if (v.interior_color && !(COLORS as readonly string[]).includes(v.interior_color)) errors.interior_color = 'Choose a color';
  const mm = await first<{ make: string; model: string }>(db, 'SELECT mk.name AS make, md.name AS model FROM models md JOIN makes mk ON mk.id = md.make_id WHERE md.id = ? AND mk.id = ?', [v.model_id, v.make_id]);
  if (!mm) errors.model_id = 'Choose a model that matches the make';
  const dealer = await first<{ id: number; plan: string; city_id: number | null; city_name: string; zip: string; lat: number | null; lng: number | null }>(
    db, 'SELECT id, plan, city_id, city_name, zip, lat, lng FROM dealers WHERE id = ?', [opts.dealerId]);
  if (!dealer) errors._ = 'Dealer not found';
  if (Object.keys(errors).length) return { ok: false, errors };

  const existing = opts.vehicleId
    ? await first<{ id: number; status: string; slug: string; year: number; make_id: number; model_id: number; trim: string | null }>(db, 'SELECT id, status, slug, year, make_id, model_id, trim FROM vehicles WHERE id = ? AND dealer_id = ?', [opts.vehicleId, opts.dealerId])
    : null;
  if (opts.vehicleId && !existing) return { ok: false, errors: { _: 'Vehicle not found' } };

  const consumesSlot = (s: string) => s === 'active' || s === 'draft';
  if (opts.enforceLimit && consumesSlot(v.status) && (!existing || !consumesSlot(existing.status))) {
    const used = await activeVehicleCount(db, opts.dealerId);
    const limit = planOf(dealer!.plan).vehicleLimit;
    if (used >= limit) return { ok: false, errors: { _: `Your ${planOf(dealer!.plan).name} plan allows ${limit} active or draft vehicles. Mark vehicles sold, archive some, or upgrade your plan.` } };
  }
  if (v.vin) {
    const dup = await first<{ id: number }>(db, "SELECT id FROM vehicles WHERE vin = ? AND dealer_id = ? AND status IN ('active','draft') AND id != ?", [v.vin, opts.dealerId, opts.vehicleId ?? 0]);
    if (dup) return { ok: false, errors: { vin: 'You already have an active listing with this VIN.' } };
  }

  const identityChanged = !existing || existing.year !== v.year || existing.make_id !== v.make_id || existing.model_id !== v.model_id || (existing.trim ?? '') !== v.trim;
  const slug = identityChanged
    ? await uniqueSlug(db, 'vehicles', vehicleSlugBase({ year: v.year, make: mm!.make, model: mm!.model, trim: v.trim, city: dealer!.city_name }), opts.vehicleId)
    : existing!.slug;

  const cols = {
    slug, vin: v.vin || null, stock_number: v.stock_number || null, year: v.year, make_id: v.make_id, model_id: v.model_id, trim: v.trim || null,
    price_cents: v.price * 100, mileage: v.mileage, body_type: v.body_type, fuel_type: v.fuel_type, transmission: v.transmission,
    drivetrain: v.drivetrain, exterior_color: v.exterior_color || null, interior_color: v.interior_color || null, condition: v.condition,
    engine: v.engine || null, mpg_city: v.mpg_city ?? null, mpg_highway: v.mpg_highway ?? null, city_id: dealer!.city_id,
    city_name: dealer!.city_name, zip: dealer!.zip, lat: dealer!.lat, lng: dealer!.lng, description: v.description || null,
    owners: v.owners ?? null, accident_free: v.accident_free, title_status: v.title_status, service_records: v.service_records,
    history_report_url: v.history_report_url || null, status: v.status,
  };
  let id: number;
  if (existing) {
    const keys = Object.keys(cols);
    await run(db, `UPDATE vehicles SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [...(Object.values(cols) as (string | number | null)[]), nowIso(), existing.id]);
    id = existing.id;
  } else {
    const keys = [...Object.keys(cols), 'dealer_id', 'source'];
    id = await insert(db, `INSERT INTO vehicles (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, [
      ...(Object.values(cols) as (string | number | null)[]), opts.dealerId, opts.source,
    ]);
  }
  const features = [...new Set(v.features.split(/\r?\n|,/).map((f) => f.trim()).filter((f) => f.length > 0 && f.length <= 80))].slice(0, 60);
  await db.batch([
    db.prepare('DELETE FROM vehicle_features WHERE vehicle_id = ?').bind(id),
    ...features.map((f) => db.prepare('INSERT OR IGNORE INTO vehicle_features (vehicle_id, feature) VALUES (?, ?)').bind(id, f)),
  ]);
  if (v.status !== 'active') await run(db, "UPDATE featured_listings SET status = 'canceled' WHERE vehicle_id = ? AND status = 'active' AND source = 'plan'", [id]);
  await audit(db, opts.actorId, existing ? 'vehicle.update' : 'vehicle.create', 'vehicle', id, { status: v.status });
  return { ok: true, id };
}

export async function deleteVehicle(db: D1Database, bucket: R2Bucket, vehicleId: number, actorId: number): Promise<void> {
  const imgs = await db.prepare('SELECT key_large, key_small FROM vehicle_images WHERE vehicle_id = ?').bind(vehicleId).all<{ key_large: string; key_small: string }>();
  await deleteImages(bucket, (imgs.results ?? []).flatMap((i) => [i.key_large, i.key_small]));
  await run(db, 'DELETE FROM vehicles WHERE id = ?', [vehicleId]);
  await audit(db, actorId, 'vehicle.delete', 'vehicle', vehicleId);
}

/** Image management actions posted from the vehicle edit page. */
export async function imageAction(db: D1Database, bucket: R2Bucket, vehicleId: number, action: string, imageId: number): Promise<void> {
  const imgs = (await db.prepare('SELECT id, key_large, key_small, position FROM vehicle_images WHERE vehicle_id = ? ORDER BY position, id').bind(vehicleId).all<{ id: number; key_large: string; key_small: string; position: number }>()).results ?? [];
  const idx = imgs.findIndex((i) => i.id === imageId);
  if (idx < 0) return;
  if (action === 'img_delete') {
    await deleteImages(bucket, [imgs[idx].key_large, imgs[idx].key_small]);
    await run(db, 'DELETE FROM vehicle_images WHERE id = ?', [imageId]);
    return;
  }
  const order = imgs.map((i) => i.id);
  if (action === 'img_cover') order.unshift(...order.splice(idx, 1));
  else if (action === 'img_left' && idx > 0) [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
  else if (action === 'img_right' && idx < order.length - 1) [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
  await db.batch(order.map((id, pos) => db.prepare('UPDATE vehicle_images SET position = ? WHERE id = ?').bind(pos, id)));
}
