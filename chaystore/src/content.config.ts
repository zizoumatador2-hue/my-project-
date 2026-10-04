import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { HUB_IDS } from './lib/site';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().max(60),
    description: z.string().max(160),
    hub: z.enum(HUB_IDS),
    keyword: z.string(),
    publishDate: z.coerce.date(),
    modifiedDate: z.coerce.date(),
    image: z.string().default(''),
    imageAlt: z.string().default(''),
    imageAltSuggestion: z.string().default(''),
    imagePos: z.string().default(''),
    imageId: z.number().optional(),
    keyTakeaways: z.array(z.string()).min(3),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4),
    related: z.array(z.string()).default([]),
    wellness: z.boolean().default(false),
    gear: z.boolean().default(false),
    howto: z
      .object({
        totalTime: z.string(), // ISO 8601 duration, e.g. PT10M
        steps: z.array(z.object({ name: z.string(), text: z.string() })).min(2),
      })
      .optional(),
  }),
});

const pillar = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pillar' }),
  schema: z.object({ title: z.string(), order: z.number() }),
});

export const collections = { articles, pillar };
