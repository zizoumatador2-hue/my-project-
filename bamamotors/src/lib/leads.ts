import { first, insert } from './db';
import { LEAD_TYPES, type LeadType } from './constants';
import { sendEmail, notify, notifyAdmins } from './email';
import { formatPrice, vehicleTitle } from './format';

export interface LeadInput {
  type: LeadType;
  vehicle_id?: number;
  dealer_id?: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferred_date: string;
}

export type LeadResult = { ok: true; id: number } | { ok: false; error: string };

/** Creates a lead, resolving the dealer from the vehicle, and notifies the dealer (in-app + email). */
export async function createLead(env: Env, input: LeadInput, ctx: { userId: number | null; ipHash: string; path: string }): Promise<LeadResult> {
  const db = env.DB;
  let dealerId: number | null = input.dealer_id ?? null;
  let vehicleLabel: string | null = null;
  let vehicleSlug: string | null = null;

  if (input.vehicle_id) {
    const v = await first<{ id: number; dealer_id: number; year: number; trim: string | null; price_cents: number; slug: string; make_name: string; model_name: string; status: string }>(
      db,
      `SELECT v.id, v.dealer_id, v.year, v.trim, v.price_cents, v.slug, v.status, mk.name AS make_name, md.name AS model_name
         FROM vehicles v JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id WHERE v.id = ?`,
      [input.vehicle_id],
    );
    if (!v || v.status === 'draft' || v.status === 'archived') return { ok: false, error: 'This vehicle is no longer available.' };
    dealerId = v.dealer_id;
    vehicleLabel = `${vehicleTitle(v)} — ${formatPrice(v.price_cents)}`;
    vehicleSlug = v.slug;
  }

  let dealer: { id: number; name: string; email: string; owner_user_id: number } | null = null;
  if (dealerId) {
    dealer = await first(db, "SELECT id, name, email, owner_user_id FROM dealers WHERE id = ? AND status = 'active'", [dealerId]);
    if (!dealer) return { ok: false, error: 'This dealer is not accepting inquiries right now.' };
  } else if (input.type !== 'financing') {
    return { ok: false, error: 'Choose a vehicle or dealer to contact.' };
  }

  const id = await insert(
    db,
    `INSERT INTO leads (type, vehicle_id, dealer_id, user_id, name, email, phone, message, preferred_date, vehicle_label, source_path, ip_hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.type, input.vehicle_id ?? null, dealer?.id ?? null, ctx.userId, input.name, input.email, input.phone || null,
      input.message || null, input.preferred_date || null, vehicleLabel, ctx.path.slice(0, 300), ctx.ipHash,
    ],
  );

  const site = env.SITE_URL.replace(/\/$/, '');
  const kind = LEAD_TYPES[input.type];
  const summary = [
    `Type: ${kind}`,
    vehicleLabel ? `Vehicle: ${vehicleLabel}` : null,
    vehicleSlug ? `Listing: ${site}/vehicles/${vehicleSlug}` : null,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.preferred_date ? `Preferred date: ${input.preferred_date}` : null,
    input.message ? `\nMessage:\n${input.message}` : null,
  ].filter(Boolean).join('\n');

  if (dealer) {
    await notify(db, dealer.owner_user_id, `New lead: ${kind}`, `${input.name}${vehicleLabel ? ` — ${vehicleLabel}` : ''}`, `/dashboard/leads/${id}`);
    await sendEmail(env, dealer.email, `New BamaMotors lead: ${kind}`, `${summary}\n\nManage this lead: ${site}/dashboard/leads/${id}`);
  } else {
    await notifyAdmins(db, `New site lead: ${kind}`, input.name, `/admin/leads?id=${id}`);
  }
  await sendEmail(
    env,
    input.email,
    'We received your request — BamaMotors',
    `Hi ${input.name},\n\nThanks for your ${kind.toLowerCase()} request${dealer ? ` for ${dealer.name}` : ''}. ` +
      `${dealer ? 'The dealership' : 'Our team'} will reply using the contact details you provided.\n\n${summary}\n\n— BamaMotors\n${site}`,
  );
  return { ok: true, id };
}
