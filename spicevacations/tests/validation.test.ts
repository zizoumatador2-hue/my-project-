import { describe, expect, it } from 'vitest';
import { ContactSchema, NewsletterSchema, PlanSchema } from '../src/lib/validation';
import { parseCsv } from '../scripts/lib/csv.mjs';

describe('validation', () => {
  it('accepts a good contact message and rejects missing consent', () => {
    const ok = ContactSchema.safeParse({ name: 'Ana', email: 'ana@example.com', message: 'Hello there, a question.', consent: 'yes' });
    expect(ok.success).toBe(true);
    const bad = ContactSchema.safeParse({ name: 'Ana', email: 'ana@example.com', message: 'Hello there, a question.' });
    expect(bad.success).toBe(false);
  });
  it('rejects a filled honeypot', () => {
    expect(NewsletterSchema.safeParse({ email: 'a@b.co', website: 'spam' }).success).toBe(false);
  });
  it('coerces and bounds planner input', () => {
    const r = PlanSchema.safeParse({ budget: '2500', days: '5', adults: '2' });
    expect(r.success && r.data.budget).toBe(2500);
    expect(PlanSchema.safeParse({ days: 90 }).success).toBe(false);
    expect(PlanSchema.safeParse({ destination: '../etc' }).success).toBe(false);
  });
});

describe('csv import', () => {
  it('parses quoted CSV with commas and escaped quotes', () => {
    const rows = parseCsv('name,summary\n"Resort A","Big, calm ""beach"""\n');
    expect(rows).toEqual([{ name: 'Resort A', summary: 'Big, calm "beach"' }]);
  });
});
