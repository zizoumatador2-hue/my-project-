import type { APIRoute } from 'astro';
import { z } from 'zod';
import { first, run } from '../../lib/db';
import { formToObject } from '../../lib/validation';
import { notifyAdmins } from '../../lib/email';
import { rateLimit } from '../../lib/security';

const schema = z.object({
  dealer_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20, 'Please write at least 20 characters').max(3000),
});

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const fd = await request.formData();
  const db = locals.runtime.env.DB;
  const dealer = await first<{ id: number; slug: string; owner_user_id: number }>(db, "SELECT id, slug, owner_user_id FROM dealers WHERE id = ? AND status = 'active'", [Number(fd.get('dealer_id'))]);
  if (!dealer) return redirect('/dealers', 303);
  const back = `/dealers/${dealer.slug}`;
  if (!locals.user) return redirect(`/login?next=${encodeURIComponent(back + '#reviews')}`, 303);
  if (locals.user.id === dealer.owner_user_id) return redirect(`${back}?review_err=${encodeURIComponent('You cannot review your own dealership.')}#reviews`, 303);
  if (!(await rateLimit(db, `review:${locals.user.id}`, 5, 86400))) return redirect(`${back}?review_err=${encodeURIComponent('Too many reviews today.')}#reviews`, 303);
  const parsed = schema.safeParse(formToObject(fd));
  if (!parsed.success) return redirect(`${back}?review_err=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Invalid review')}#reviews`, 303);
  await run(
    db,
    `INSERT INTO reviews (dealer_id, user_id, rating, title, body) VALUES (?,?,?,?,?)
     ON CONFLICT(dealer_id, user_id) DO UPDATE SET rating = excluded.rating, title = excluded.title, body = excluded.body, status = 'pending'`,
    [dealer.id, locals.user.id, parsed.data.rating, parsed.data.title, parsed.data.body],
  );
  await notifyAdmins(db, 'Review awaiting moderation', parsed.data.title, '/admin/reviews');
  return redirect(`${back}?ok=review#reviews`, 303);
};
