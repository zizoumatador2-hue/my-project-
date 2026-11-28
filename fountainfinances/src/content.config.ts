import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const hub = z.enum(['personal-finance', 'credit', 'banking', 'loans', 'mortgage', 'insurance']);
const isoDate = z.coerce.date();

const faq = z.object({ q: z.string(), a: z.string() });
const source = z.object({ title: z.string(), publisher: z.string(), url: z.string().url() });

/** Long-form educational articles at /guides/<slug>/ */
const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(62),
    description: z.string().min(110).max(160),
    keywords: z.array(z.string()).min(2),
    hub,
    topics: z.array(z.string()).default([]),
    published: isoDate,
    updated: isoDate,
    author: reference('authors'),
    reviewer: reference('authors').optional(),
    quickAnswer: z.string(),
    takeaways: z.array(z.string()).min(3),
    faqs: z.array(faq).min(3),
    sources: z.array(source).min(2),
    howTo: z
      .object({
        name: z.string(),
        totalTime: z.string().optional(),
        steps: z.array(z.object({ name: z.string(), text: z.string() })).min(3),
      })
      .optional(),
    related: z.array(z.string()).default([]),
    calculators: z.array(z.string()).default([]),
    comparisons: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** Pillar hub pages (/personal-finance/, /credit/ ...) — long-form overview body */
const hubs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/hubs' }),
  schema: z.object({
    updated: isoDate,
    faqs: z.array(faq).default([]),
    featuredGuides: z.array(z.string()).default([]),
  }),
});

/** Topic pages under each hub, at /<slug>/ */
const topics = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(62),
    description: z.string().min(110).max(160),
    keywords: z.array(z.string()).min(2),
    hub,
    order: z.number().default(50),
    summary: z.string(),
    updated: isoDate,
    faqs: z.array(faq).default([]),
    calculators: z.array(z.string()).default([]),
    comparisons: z.array(z.string()).default([]),
    guides: z.array(z.string()).default([]),
  }),
});

/** "Best ..." comparison pages at /best/<slug>/ */
const comparisons = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/comparisons' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(62),
    description: z.string().min(110).max(160),
    keywords: z.array(z.string()).min(2),
    hub,
    category: z.string(),
    published: isoDate,
    updated: isoDate,
    author: reference('authors'),
    intro: z.string(),
    criteria: z.array(z.object({ name: z.string(), detail: z.string() })).min(3),
    faqs: z.array(faq).default([]),
    sources: z.array(source).default([]),
    related: z.array(z.string()).default([]),
    calculators: z.array(z.string()).default([]),
  }),
});

/**
 * Financial products shown in comparison tables.
 * Numeric terms (APY, APR, fees) are shown ONLY when an editor has recorded
 * the value together with the date it was confirmed and the page it came from.
 */
const verifiedValue = z.object({
  value: z.string(),
  asOf: isoDate,
  sourceUrl: z.string().url(),
});

const products = defineCollection({
  loader: file('./src/data/products.json'),
  schema: z.object({
    id: z.string(),
    category: z.string(),
    provider: z.string(),
    product: z.string(),
    officialUrl: z.string().url(),
    /** Set only when an affiliate agreement exists. Rendered with rel="sponsored". */
    affiliateUrl: z.string().url().optional(),
    insured: z.enum(['FDIC', 'NCUA', 'none', 'n/a']).default('n/a'),
    type: z.string(),
    bestFor: z.string(),
    features: z.array(z.string()).min(2),
    pros: z.array(z.string()).min(1),
    cons: z.array(z.string()).min(1),
    considerations: z.string(),
    requirements: z.string(),
    rate: verifiedValue.optional(),
    fees: verifiedValue.optional(),
    minimum: verifiedValue.optional(),
    active: z.boolean().default(true),
  }),
});

const authors = defineCollection({
  loader: file('./src/data/authors.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['Person', 'Organization']),
    role: z.string(),
    bio: z.string(),
    expertise: z.array(z.string()),
    credentials: z.array(z.string()).default([]),
    email: z.string().email().optional(),
    sameAs: z.array(z.string().url()).default([]),
  }),
});

export const collections = { hubs, guides, topics, comparisons, products, authors };
