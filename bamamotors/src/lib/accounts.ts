import { first, insert, run, audit } from './db';
import { hashPassword } from './crypto';
import { slugify, uniqueSlug } from './slug';
import { notifyAdmins, sendEmail } from './email';

export async function emailTaken(db: D1Database, email: string): Promise<boolean> {
  return !!(await first(db, 'SELECT id FROM users WHERE email = ?', [email]));
}

export async function createUser(
  env: Env,
  data: { name: string; email: string; password: string; phone?: string },
  role: 'consumer' | 'dealer',
): Promise<number> {
  const bootstrap = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const finalRole = role === 'consumer' && bootstrap && data.email === bootstrap ? 'admin' : role;
  const id = await insert(env.DB, 'INSERT INTO users (email, password_hash, name, phone, role) VALUES (?,?,?,?,?)', [
    data.email, await hashPassword(data.password), data.name, data.phone || null, finalRole,
  ]);
  await audit(env.DB, id, 'user.signup', 'user', id, { role: finalRole });
  return id;
}

/** Resolves a dealer's coordinates from its ZIP code and links it to a known city when one matches. */
export async function locateDealer(db: D1Database, cityName: string, zip: string) {
  const z = await first<{ lat: number; lng: number }>(db, 'SELECT lat, lng FROM zip_codes WHERE zip = ?', [zip]);
  const city = await first<{ id: number; lat: number; lng: number }>(db, "SELECT id, lat, lng FROM cities WHERE lower(name) = lower(?)", [cityName.trim()]);
  return { lat: z?.lat ?? city?.lat ?? null, lng: z?.lng ?? city?.lng ?? null, cityId: city?.id ?? null };
}

export async function createDealer(
  env: Env,
  userId: number,
  data: { dealer_name: string; dealer_phone: string; email: string; address: string; city: string; zip: string },
  settings: Record<string, string>,
  status?: 'pending' | 'active',
): Promise<number> {
  const db = env.DB;
  const loc = await locateDealer(db, data.city, data.zip);
  const slug = await uniqueSlug(db, 'dealers', slugify(data.dealer_name));
  const finalStatus = status ?? (settings.dealer_auto_approve === '1' ? 'active' : 'pending');
  const id = await insert(
    db,
    'INSERT INTO dealers (owner_user_id, slug, name, phone, email, address, city_id, city_name, zip, lat, lng, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [userId, slug, data.dealer_name, data.dealer_phone, data.email, data.address, loc.cityId, data.city.trim(), data.zip, loc.lat, loc.lng, finalStatus],
  );
  await run(db, 'INSERT INTO dealer_profiles (dealer_id) VALUES (?)', [id]);
  await audit(db, userId, 'dealer.create', 'dealer', id, { status: finalStatus });
  if (finalStatus === 'pending') {
    await notifyAdmins(db, 'New dealer awaiting approval', data.dealer_name, `/admin/dealers/${id}`);
  }
  const site = env.SITE_URL.replace(/\/$/, '');
  await sendEmail(
    env,
    data.email,
    'Welcome to BamaMotors for Dealers',
    `Thanks for registering ${data.dealer_name} on BamaMotors.\n\n` +
      (finalStatus === 'pending'
        ? 'Our team is reviewing your dealership. You can start adding inventory now — listings go live as soon as your account is approved.\n\n'
        : 'Your dealership is live. Add your first vehicles from the dashboard.\n\n') +
      `Dashboard: ${site}/dashboard\n\n— BamaMotors`,
  );
  return id;
}
