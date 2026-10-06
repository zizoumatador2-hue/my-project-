import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const categorySlugs = [
  'gaming-tips', 'game-guides', 'beginner-guides', 'advanced-strategies', 'game-settings',
  'gaming-performance', 'gaming-gear', 'game-comparisons', 'troubleshooting', 'gaming-news',
] as const;

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().max(70),
    seoTitle: z.string().max(60).optional(),
    description: z.string().min(80).max(160),
    category: z.enum(categorySlugs),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    author: z.string().default('editorial-team'),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** 40-60 word direct answer, shown in a highlighted box (paragraph-snippet target). */
    quickAnswer: z.string(),
    imageAlt: z.string(),
    imageQuery: z.string().optional(), // Pexels search query used by `npm run images:pexels`
    game: z.string().optional(), // slug in the games collection
    related: z.array(z.string()).default([]),
    products: z.array(z.string()).default([]), // product ids
    productsHeading: z.string().optional(),
    hasAffiliate: z.boolean().default(false),
    /** Set to the sponsor's name to label a post as sponsored content (shown prominently, links get rel=sponsored). */
    sponsor: z.string().optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    howTo: z
      .object({
        name: z.string(),
        totalTime: z.string().optional(), // ISO 8601 duration, e.g. PT30M
        steps: z.array(z.object({ name: z.string(), text: z.string() })),
      })
      .optional(),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    featured: z.boolean().default(false),
    popular: z.number().optional(), // lower = higher on the "popular" rail
  }),
});

const games = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/games' }),
  schema: z.object({
    name: z.string(),
    developer: z.string(),
    genre: z.string(),
    platforms: z.array(z.string()),
    summary: z.string(),
    overview: z.array(z.string()),
    wikipedia: z.string().url().optional(),
    trending: z.boolean().default(false),
    // Typed sections: each lists article slugs (from the articles collection)
    sections: z
      .object({
        beginner: z.array(z.string()).default([]),
        advanced: z.array(z.string()).default([]),
        settings: z.array(z.string()).default([]),
        builds: z.array(z.string()).default([]),
        weapons: z.array(z.string()).default([]),
        characters: z.array(z.string()).default([]),
        troubleshooting: z.array(z.string()).default([]),
      })
      .default({}),
    gear: z.array(z.string()).default([]), // product ids
    notes: z.string().optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    type: z.enum(['Person', 'Organization']).default('Organization'),
    role: z.string(),
    bio: z.string(),
    expertise: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    kind: z.string(), // e.g. "Mouse", "Headset"
    summary: z.string(),
    lookFor: z.array(z.string()), // key specifications to check
    suitableFor: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    affiliateUrl: z.string().default('AFFILIATE_LINK_PLACEHOLDER'),
    cta: z.string().default('Check price'),
  }),
});

const pillar = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pillar' }),
  schema: z.object({ title: z.string() }),
});

export const collections = { articles, games, authors, products, pillar };
