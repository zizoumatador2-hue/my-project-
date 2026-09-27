import { z, type ZodTypeAny } from 'zod';
import { HttpError } from './util';

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) fields[issue.path.join('.') || '_'] = issue.message;
    throw new HttpError(400, 'validation', 'تحقق من الحقول المدخلة.', { fields });
  }
  return r.data;
}

export async function body<S extends ZodTypeAny>(req: { json: () => Promise<unknown> }, schema: S): Promise<z.infer<S>> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new HttpError(400, 'bad_json', 'صيغة الطلب غير صالحة.');
  }
  return parse(schema, data);
}

/** Strips control characters (except newlines/tabs) and trims. React escapes on output; this keeps stored data clean. */
export const cleanText = (min: number, max: number, msg?: string) =>
  z.string().transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, '').trim())
    .pipe(z.string().min(min, msg ?? `الحد الأدنى ${min} أحرف`).max(max, `الحد الأقصى ${max} حرف`));

export const idParam = z.string().regex(/^[a-z]{2,4}_[0-9a-f]{24}$/, 'معرّف غير صالح');

export function pageParams(q: Record<string, string | undefined>) {
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 24));
  const offset = Math.max(0, Math.min(100_000, Number(q.offset) || 0));
  return { limit, offset };
}
