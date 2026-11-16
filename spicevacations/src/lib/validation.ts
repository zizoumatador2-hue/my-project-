import { z } from 'zod';

/** Server-side validation schemas shared by the Worker and unit tests. */

const trimmed = (max: number) => z.string().trim().max(max);

export const PlanSchema = z.object({
  budget: z.coerce.number().int().min(0).max(1_000_000).optional(),
  departureCity: trimmed(80).optional(),
  destination: z.string().regex(/^[a-z0-9-]{1,60}$/).optional().or(z.literal('')),
  region: z.enum(['usa', 'mexico', 'caribbean', 'any', '']).optional(),
  travelers: z.enum(['couple', 'family', 'friends', 'solo']).optional(),
  adults: z.coerce.number().int().min(1).max(12).optional(),
  children: z.coerce.number().int().min(0).max(10).optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
  vacationType: z.string().regex(/^[a-z0-9-]{1,60}$/).optional().or(z.literal('')),
  interests: z.array(z.string().trim().min(2).max(30)).max(12).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  text: trimmed(1200).optional(),
});
export type PlanRequest = z.infer<typeof PlanSchema>;

export const ContactSchema = z.object({
  name: trimmed(100).min(2, 'Please enter your name.'),
  email: z.string().trim().max(200).pipe(z.email('Please enter a valid email address.')),
  topic: z.enum(['general', 'trip-question', 'partnership', 'correction', 'press']).default('general'),
  message: trimmed(5000).min(10, 'Please write a message of at least 10 characters.'),
  consent: z.literal('yes', { message: 'Please agree to our privacy policy so we can reply.' }),
  website: z.string().max(0, 'Spam detected.').optional().or(z.literal('')),
  ts: z.coerce.number().optional(),
});

export const NewsletterSchema = z.object({
  email: z.string().trim().max(200).pipe(z.email('Please enter a valid email address.')),
  website: z.string().max(0).optional().or(z.literal('')),
  source: trimmed(40).optional(),
});

/** Normalize form or JSON bodies into plain objects (interests may arrive as repeated fields). */
export function formToObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string') continue;
    if (k === 'interests') ((o.interests as string[]) ||= []).push(v);
    else o[k] = v === '' ? undefined : v;
  }
  return o;
}
