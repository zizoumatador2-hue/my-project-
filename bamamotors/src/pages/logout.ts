import type { APIRoute } from 'astro';
import { destroySession } from '../lib/auth';

export const POST: APIRoute = async ({ locals, cookies, redirect }) => {
  await destroySession(locals.runtime.env.DB, cookies);
  return redirect('/', 303);
};
export const GET: APIRoute = ({ redirect }) => redirect('/', 302);
