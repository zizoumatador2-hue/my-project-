import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content model. The entry id (file name) is the URL slug and must be lowercase-hyphenated.
 * Every page type is driven by these collections: adding a destination, resort, guide, deal or vacation type is a new Markdown file
 * (or a CMS entry in /admin) — never a code change.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must be lowercase and hyphenated');

/** Required SEO block. Lengths are enforced so editors cannot publish thin metadata. */
const seo = {
  metaTitle: z.string().min(20).max(62),
  metaDescription: z.string().min(110).max(165),
  ogImage: z.string().optional(),
  canonical: z.string().url().optional(),
  noindex: z.boolean().default(false),
};

const faq = z.object({ q: z.string().min(8), a: z.string().min(20) });

/** Imagery: an illustrated brand scene is always available; a real photo can override it. */
const media = {
  scene: z
    .enum(['beach', 'sunset', 'tropical', 'overwater', 'mountains', 'city', 'desert', 'cliffs', 'vineyard', 'lake', 'cruise', 'pool', 'volcano', 'harbor'])
    .default('beach'),
  palette: z.enum(['coral', 'gold', 'teal', 'dusk', 'night']).default('coral'),
  image: z.string().optional(),
  imageAlt: z.string().min(10),
  imageCredit: z.string().optional(),
  /** Optional Pexels search query used by scripts/fetch-photos.mjs to pick a matching photo. */
  photoQuery: z.string().optional(),
};

export const REGIONS = ['usa', 'mexico', 'caribbean'] as const;
export const TRAVELERS = ['couples', 'honeymooners', 'families', 'friends', 'solo'] as const;
export const BUDGET_STYLES = ['value', 'mid-range', 'splurge'] as const;
export const RESORT_TYPES = ['all-inclusive', 'adults-only', 'luxury', 'beachfront', 'boutique', 'spa', 'casino', 'historic', 'overwater'] as const;
const MONTH = z.number().int().min(1).max(12);

const destinations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinations' }),
  schema: z.object({
    name: z.string(),
    ...seo,
    ...media,
    region: z.enum(REGIONS),
    country: z.string(),
    state: z.string().optional(),
    tagline: z.string().max(110),
    summary: z.string().min(80).max(320),
    bestMonths: z.array(MONTH).min(1),
    bestTimeNote: z.string(),
    airports: z.array(z.string()).default([]),
    idealFor: z.array(z.enum(TRAVELERS)).min(1),
    budgetStyles: z.array(z.enum(BUDGET_STYLES)).min(1),
    vacationTypes: z.array(slug).min(1),
    activities: z.array(z.string()).min(3),
    highlights: z.array(z.object({ title: z.string(), text: z.string() })).min(3),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    faqs: z.array(faq).default([]),
    updated: z.coerce.date(),
  }),
});

const resorts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resorts' }),
  schema: z.object({
    name: z.string(),
    ...seo,
    ...media,
    destination: slug,
    location: z.string(),
    resortTypes: z.array(z.enum(RESORT_TYPES)).min(1),
    vacationTypes: z.array(slug).min(1),
    idealFor: z.array(z.enum(TRAVELERS)).min(1),
    budgetStyle: z.enum(BUDGET_STYLES),
    adultsOnly: z.boolean().default(false),
    summary: z.string().min(80).max(320),
    features: z.array(z.string()).min(3).max(8),
    goodToKnow: z.array(z.string()).default([]),
    /** Only set when a real, sourced value exists. Never estimate. */
    rating: z.object({ value: z.number().min(0).max(5), count: z.number().int().positive(), source: z.string(), url: z.string().url() }).optional(),
    featured: z.boolean().default(false),
    faqs: z.array(faq).default([]),
    updated: z.coerce.date(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(20).max(110),
    ...seo,
    ...media,
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()).default([]),
    category: slug,
    destinations: z.array(slug).default([]),
    resorts: z.array(slug).default([]),
    related: z.array(slug).default([]),
    /** 40–60 word direct answer rendered first for paragraph featured snippets. */
    snippet: z.string().min(180).max(420),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    author: z.string().default('spicevacations-editorial'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    howTo: z
      .object({ name: z.string(), totalTime: z.string(), steps: z.array(z.object({ name: z.string(), text: z.string() })).min(3) })
      .optional(),
    faqs: z.array(faq).default([]),
  }),
});

const vacationTypes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/vacation-types' }),
  schema: z.object({
    name: z.string(),
    ...seo,
    ...media,
    tagline: z.string().max(110),
    summary: z.string().min(80).max(320),
    icon: z.enum(['heart', 'users', 'gem', 'wine', 'palmtree', 'crown', 'sun', 'calendar', 'ship', 'sparkles']),
    order: z.number().default(100),
    pillarGuide: slug.optional(),
    faqs: z.array(faq).default([]),
  }),
});

const deals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/deals' }),
  schema: z.object({
    title: z.string(),
    ...seo,
    ...media,
    destination: slug,
    vacationType: slug,
    productType: z.enum(['hotel', 'resort', 'flight', 'cruise', 'car', 'tour', 'insurance']),
    window: z.string(),
    months: z.array(MONTH).min(1),
    summary: z.string().min(80).max(320),
    tips: z.array(z.string()).min(3),
    featured: z.boolean().default(false),
    updated: z.coerce.date(),
    faqs: z.array(faq).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(0),
    anchor: z.string().optional(),
    updated: z.coerce.date().optional(),
    faqs: z.array(faq).default([]),
    howTo: z
      .object({ name: z.string(), totalTime: z.string(), steps: z.array(z.object({ name: z.string(), text: z.string() })).min(3) })
      .optional(),
  }),
});

export const collections = { destinations, resorts, guides, vacationTypes, deals, pages };
