import { z } from 'zod';
import { BODY_TYPES, COLORS, CONDITIONS, DRIVETRAINS, FUEL_TYPES, TITLE_STATUSES, TRANSMISSIONS, VEHICLE_STATUSES } from './constants';

const trimmed = (max: number) => z.string().trim().max(max);
const values = (list: readonly (string | { value: string })[]) => list.map((x) => (typeof x === 'string' ? x : x.value));
/** A value from one of the fixed lists in constants.ts (the same lists the forms and search filters use). */
const oneOf = (list: readonly (string | { value: string })[], message: string) =>
  z.string().trim().refine((v) => values(list).includes(v), message);
const optionalOneOf = (list: readonly (string | { value: string })[], message: string) =>
  z.string().trim().optional().default('').refine((v) => v === '' || values(list).includes(v), message);
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === '' || v.replace(/\D/g, '').length >= 10, 'Enter a 10-digit phone number');
export const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(200);
export const zipSchema = z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code');
export const urlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'Enter a full URL starting with https://');

export const signupSchema = z.object({
  name: trimmed(120).min(2, 'Enter your name'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional().default(''),
});

export const dealerSignupSchema = signupSchema.extend({
  dealer_name: trimmed(120).min(2, 'Enter your dealership name'),
  dealer_phone: phoneSchema.refine((v) => v !== '', 'Enter the dealership phone'),
  address: trimmed(200).min(5, 'Enter the street address'),
  city: trimmed(80).min(2, 'Enter the city'),
  zip: zipSchema,
});

export const leadSchema = z.object({
  type: z.enum(['contact', 'info', 'price', 'test_drive', 'financing']),
  vehicle_id: z.coerce.number().int().positive().optional(),
  dealer_id: z.coerce.number().int().positive().optional(),
  name: trimmed(120).min(2, 'Enter your name'),
  email: emailSchema,
  phone: phoneSchema.optional().default(''),
  message: trimmed(3000).optional().default(''),
  preferred_date: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v), 'Pick a valid date'),
  consent: z.literal('on', { errorMap: () => ({ message: 'Please agree so the dealer can contact you' }) }),
});

const currentYear = new Date().getUTCFullYear();
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,$\s]/g, ''))), z.number().int().min(min).max(max).optional());
const optTri = z.preprocess((v) => (v === '' || v === undefined ? null : v === '1' ? 1 : v === '0' ? 0 : null), z.number().int().nullable());

export const vehicleSchema = z.object({
  year: z.coerce.number().int().min(1950).max(currentYear + 2),
  make_id: z.coerce.number().int().positive({ message: 'Choose a make' }),
  model_id: z.coerce.number().int().positive({ message: 'Choose a model' }),
  trim: trimmed(60).optional().default(''),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .default('')
    .refine((v) => v === '' || /^[A-HJ-NPR-Z0-9]{17}$/.test(v), 'A VIN has 17 characters (no I, O or Q)'),
  stock_number: trimmed(40).optional().default(''),
  price: z.preprocess((v) => Number(String(v ?? '').replace(/[,$\s]/g, '')), z.number({ invalid_type_error: 'Enter a price' }).int().min(1, 'Enter a price').max(2_000_000)),
  mileage: z.preprocess((v) => Number(String(v ?? '').replace(/[,\s]/g, '')), z.number({ invalid_type_error: 'Enter the mileage' }).int().min(0).max(2_000_000)),
  body_type: oneOf(BODY_TYPES, 'Choose a body type'),
  fuel_type: oneOf(FUEL_TYPES, 'Choose a fuel type'),
  transmission: oneOf(TRANSMISSIONS, 'Choose a transmission'),
  drivetrain: oneOf(DRIVETRAINS, 'Choose a drivetrain'),
  exterior_color: optionalOneOf(COLORS, 'Choose a color'),
  interior_color: optionalOneOf(COLORS, 'Choose a color'),
  condition: oneOf(CONDITIONS, 'Choose a condition'),
  engine: trimmed(80).optional().default(''),
  mpg_city: optInt(1, 200),
  mpg_highway: optInt(1, 200),
  description: trimmed(8000).optional().default(''),
  owners: optInt(0, 50),
  accident_free: optTri,
  title_status: z.string().trim().optional().default('unknown').refine((v) => values(TITLE_STATUSES).includes(v), 'Choose a title status'),
  service_records: optTri,
  history_report_url: urlSchema.optional().default(''),
  status: z.string().trim().optional().default('active').refine((v) => values(VEHICLE_STATUSES).includes(v), 'Choose a status'),
  features: trimmed(3000).optional().default(''),
});

export type FieldErrors = Record<string, string>;

export function zodErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? '_');
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export function formToObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') o[k] = v;
  return o;
}
